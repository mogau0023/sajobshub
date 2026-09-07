import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoadingSpinner } from "@/components/loading-spinner";
import { fetchActiveProvinces } from "@/lib/job-queries";
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
  const { data: activeProvinces, isLoading } = useQuery({
    queryKey: ["active-provinces"],
    queryFn: fetchActiveProvinces,
  });

  const visibleProvinces = PROVINCES.filter((p) => activeProvinces?.includes(p));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Jobs by Province</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your province to see vacancies near you.
        </p>
        {isLoading ? (
          <div className="mt-6">
            <LoadingSpinner label="Loading provinces…" />
          </div>
        ) : visibleProvinces.length === 0 ? (
          <p className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No provinces have vacancies right now. Check back soon or browse all jobs.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {visibleProvinces.map((province) => (
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
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
