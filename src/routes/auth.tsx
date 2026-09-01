import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  fbAuth,
  fbOnAuthChanged,
  fbSignIn,
  fbSignOut,
  fbSignUp,
  isUserAdmin,
} from "@/integrations/firebase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Administrator Sign In — SA Jobs" },
      {
        name: "description",
        content:
          "Secure sign-in for the SA Jobs editorial team who publish and maintain verified vacancies.",
      },
      { property: "og:title", content: "Administrator Sign In — SA Jobs" },
      {
        property: "og:description",
        content: "Editorial access to the SA Jobs vacancy management dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = fbAuth();
    let active = true;

    const syncAccess = async (user: ReturnType<typeof fbAuth>["currentUser"]) => {
      if (!active) return;
      if (!user) {
        setDeniedEmail(null);
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(true);
      try {
        const admin = await isUserAdmin(user.uid);
        if (!active) return;
        if (admin) {
          navigate({ to: "/admin", replace: true });
          return;
        }
        setDeniedEmail(user.email ?? "this account");
      } finally {
        if (active) setCheckingAccess(false);
      }
    };

    void syncAccess(auth.currentUser);
    const unsub = fbOnAuthChanged(auth, (user) => {
      void syncAccess(user);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const credential = await fbSignIn(fbAuth(), email, password);
        const admin = await isUserAdmin(credential.user.uid);
        if (admin) {
          navigate({ to: "/admin", replace: true });
        } else {
          setDeniedEmail(credential.user.email ?? email);
          toast.error("This account is signed in, but it does not have administrator rights yet.");
        }
      } else {
        const credential = await fbSignUp(fbAuth(), email, password);
        setDeniedEmail(credential.user.email ?? email);
        toast.success("Account created. Ask an existing administrator to grant you admin rights.");
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-navy">Administrator sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is restricted to the SA Jobs editorial team. Job seekers do not need an account.
        </p>

        {deniedEmail && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p>
              Signed in as <span className="font-semibold">{deniedEmail}</span>, but this account
              does not have administrator access yet.
            </p>
            <button
              type="button"
              onClick={async () => {
                await fbSignOut(fbAuth());
                setDeniedEmail(null);
                toast.success("Signed out.");
              }}
              className="mt-3 text-xs font-semibold underline"
            >
              Sign out and use another account
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy || checkingAccess}
            className="w-full rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-soft disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : checkingAccess
                ? "Checking access…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="w-full text-center text-xs font-medium text-muted-foreground underline"
          >
            {mode === "signin"
              ? "Need an editorial account? Register"
              : "Already registered? Sign in"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
