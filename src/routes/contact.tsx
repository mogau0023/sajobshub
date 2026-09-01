import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { contactMessagesCol, fbAddDoc } from "@/integrations/firebase/client";
import { SITE_EMAIL } from "@/lib/sa-jobs";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SA Jobs — Vacancy Submissions & Support" },
      {
        name: "description",
        content:
          "Get in touch with the SA Jobs team about vacancy submissions, corrections, suspicious listings or general enquiries.",
      },
      { property: "og:title", content: "Contact SA Jobs" },
      {
        property: "og:description",
        content: "Reach the SA Jobs editorial team for submissions and support.",
      },
    ],
  }),
  component: ContactPage,
});

const ENQUIRY_TYPES = [
  { value: "general", label: "General enquiry" },
  { value: "advertise", label: "Advertise a vacancy" },
  { value: "correction", label: "Report an error in a listing" },
  { value: "scam", label: "Report a suspicious vacancy" },
  { value: "technical", label: "Technical problem" },
];

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    enquiry_type: "general",
    message: "",
  });
  const [busy, setBusy] = useState(false);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Contact SA Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Send us a message and we'll reply by email, usually within one working day. You can also
          email us directly at{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="font-semibold underline">
            {SITE_EMAIL}
          </a>
          .
        </p>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await fbAddDoc(contactMessagesCol(), {
                ...form,
                created_at: new Date().toISOString(),
              });
              toast.success("Message sent. We'll be in touch shortly.");
              setForm({ name: "", email: "", subject: "", enquiry_type: "general", message: "" });
            } catch {
              toast.error("Your message could not be sent. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your name
            </span>
            <input
              required
              maxLength={100}
              {...field("name")}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email address
            </span>
            <input
              required
              type="email"
              maxLength={120}
              {...field("email")}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Enquiry type
            </span>
            <select
              {...field("enquiry_type")}
              className="h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {ENQUIRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Subject
            </span>
            <input
              required
              maxLength={150}
              {...field("subject")}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Message
            </span>
            <textarea
              required
              rows={6}
              maxLength={2000}
              {...field("message")}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
          </label>
          <button
            disabled={busy}
            className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
