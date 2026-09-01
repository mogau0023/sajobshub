import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SA Jobs — Trusted South African Vacancy Portal" },
      {
        name: "description",
        content:
          "SA Jobs is a free, manually curated South African vacancy portal. Learn how we verify listings and why we never charge job seekers.",
      },
      { property: "og:title", content: "About SA Jobs" },
      {
        property: "og:description",
        content:
          "How SA Jobs curates and verifies South African vacancies, learnerships and internships.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">About SA Jobs</h1>
        <p className="text-sm leading-relaxed text-foreground/90">
          SA Jobs is a South African job discovery platform. We publish vacancies, learnerships,
          internships and apprenticeships from government departments, municipalities, state-owned
          entities and private employers so that every South African can find real work without
          paying a cent.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">How we work</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Every listing is reviewed and published manually by our editorial team. We record the
            closing date, the reference number and the official application channel, then link you
            straight to the employer's own application process. We do not accept CVs, we do not host
            applications and we never act as a middleman between you and an employer.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Our promise to job seekers</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
            <li>• Browsing and applying through SA Jobs is always free.</li>
            <li>• We never ask for a registration fee, placement fee or "admin" payment.</li>
            <li>• We link to the original source so you can verify each vacancy yourself.</li>
            <li>
              • Suspicious listings can be reported on every job page and are reviewed quickly.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Stay safe</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            No legitimate South African employer will ask you to pay for a job, an interview or
            training materials. Never send money, bank card details or copies of your ID to an
            unverified contact.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/jobs"
            className="rounded-lg bg-navy px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Browse vacancies
          </Link>
          <Link
            to="/contact"
            className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold"
          >
            Contact us
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
