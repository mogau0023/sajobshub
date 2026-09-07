import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoadingSpinner } from "@/components/loading-spinner";
import { fetchActiveCategories } from "@/lib/job-queries";
import { CATEGORIES, slugify } from "@/lib/sa-jobs";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Job Categories in South Africa — SA Career Hub" },
      {
        name: "description",
        content:
          "Browse South African vacancies by category: government jobs, learnerships, internships, retail, security, IT, healthcare and more.",
      },
      { property: "og:title", content: "Job Categories in South Africa" },
      {
        property: "og:description",
        content: "Every SA Career hub vacancy category in one place, updated daily.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: activeCategories, isLoading } = useQuery({
    queryKey: ["active-categories"],
    queryFn: fetchActiveCategories,
  });

  const visibleCategories = CATEGORIES.filter((c) => activeCategories?.includes(c));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Job Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a category to see every current vacancy in that field.
        </p>
        {isLoading ? (
          <div className="mt-6">
            <LoadingSpinner label="Loading categories…" />
          </div>
        ) : visibleCategories.length === 0 ? (
          <p className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No categories have vacancies right now. Check back soon or browse all jobs.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {visibleCategories.map((category) => (
              <Link
                key={category}
                to="/category/$slug"
                params={{ slug: slugify(category) }}
                className="rounded-xl border border-border bg-card p-4 text-sm font-semibold shadow-sm"
              >
                {category}
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
