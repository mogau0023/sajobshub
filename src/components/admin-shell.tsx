import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import logo1 from "@/assets/logo.png";

import { fbAuth, fbSignOut } from "@/integrations/firebase/client";

export function AdminShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await fbSignOut(fbAuth());
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-navy px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to="/admin" className="flex flex-col">
            <img
              src={logo1}
              alt="Sajobshub logo"
              loading="lazy"
              className="h-12 w-auto object-contain"
            />
            <span className="text-[10px] uppercase tracking-widest text-gold">
              Editorial dashboard
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/analytics"
              className="text-xs font-medium text-primary-foreground/80 hover:text-gold"
            >
              Analytics
            </Link>
            <Link to="/" className="text-xs font-medium text-primary-foreground/80 hover:text-gold">
              View site
            </Link>
            <button
              onClick={signOut}
              className="rounded-md border border-primary-foreground/30 px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
          {action}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
