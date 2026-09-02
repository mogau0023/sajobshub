import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PROVINCES, slugify } from "@/lib/sa-jobs";

export const Route = createFileRoute("/provinces")({
  head: () => ({
    meta: [
      { title: "Jobs by Province in South Africa — SA Career Hub" },
      {
        name: "description",
        content:
          "Find vacancies in Gauteng, KwaZulu-Natal, Western Cape, Limpopo, Eastern Cape and every other South African province.",
      },
      { property: "og:title", content: "Jobs by Province in South Africa" },
      {
        property: "og:description",
        content: "Browse current vacancies in all nine South African provinces.",
      },
    ],
  }),
  component: ProvincesPage,
});

function ProvincesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Jobs by Province</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your province to see vacancies near you.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {PROVINCES.map((province) => (
            <Link
              key={province}
              to="/province/$slug"
              params={{ slug: slugify(province) }}
              className="rounded-xl border border-border bg-card p-4 text-sm font-semibold shadow-sm"
            >
              {province}
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
