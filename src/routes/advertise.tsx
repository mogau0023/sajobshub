import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_EMAIL } from "@/lib/sa-jobs";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise a Vacancy — SA Career Hub South Africa" },
      {
        name: "description",
        content:
          "Reach thousands of South African job seekers. Submit your vacancy, learnership or internship to the SA Career Hub editorial team for publication.",
      },
      { property: "og:title", content: "Advertise a Vacancy on SA Career Hub" },
      {
        property: "og:description",
        content: "Submit vacancies, learnerships and internships for publication on SA Career Hub.",
      },
    ],
  }),
  component: AdvertisePage,
});

const PACKAGES = [
  {
    name: "Standard Listing",
    detail:
      "Your vacancy published in the main feed and in every relevant category and province page.",
  },
  {
    name: "Featured Listing",
    detail:
      "Highlighted card with a gold badge, pinned above standard listings for the full run of the advert.",
  },
  {
    name: "Urgent Listing",
    detail: "Marked urgent for short-notice hiring, ideal for vacancies closing within seven days.",
  },
];

function AdvertisePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Advertise a Vacancy</h1>
        <p className="text-sm leading-relaxed text-foreground/90">
          SA Career Hub is read daily by matriculants, graduates and experienced professionals across all
          nine provinces. Send us your vacancy and our editorial team will review, format and
          publish it — usually within one working day.
        </p>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Listing options</h2>
          {PACKAGES.map((p) => (
            <div key={p.name} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">What to send us</h2>
          <ul className="space-y-1 text-sm leading-relaxed text-foreground/90">
            <li>• Job title, company name and reference number</li>
            <li>• Province, city and employment type</li>
            <li>• Minimum qualifications and experience required</li>
            <li>• Full description, responsibilities and requirements</li>
            <li>• Closing date and the exact application channel (email address or link)</li>
          </ul>
        </section>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm">
            Email your vacancy to{" "}
            <a href={`mailto:${SITE_EMAIL}`} className="font-semibold underline">
              {SITE_EMAIL}
            </a>{" "}
            or send us the details through the contact form.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex rounded-lg bg-gold px-5 py-3 text-sm font-bold text-navy"
          >
            Submit through contact form
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          We do not publish vacancies that require job seekers to pay any fee.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
