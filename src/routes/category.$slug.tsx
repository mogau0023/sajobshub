import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { fetchJobs } from "@/lib/job-queries";
import { CATEGORIES, fromSlug } from "@/lib/sa-jobs";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = fromSlug(params.slug, CATEGORIES as unknown as string[]);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Category not found — SA Jobs" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.category} in South Africa — SA Jobs`;
    const description = `Latest ${loaderData.category.toLowerCase()} in South Africa. Verified vacancies with closing dates and direct application links, updated daily.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => <Missing label="category" />,
});

function Missing({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">That {label} doesn't exist</h1>
        <Link
          to="/jobs"
          className="mt-6 inline-flex rounded-lg bg-navy px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          Browse all jobs
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["category-jobs", category],
    queryFn: () => fetchJobs({ category }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">{category} in South Africa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.total ?? 0} current vacancy{data?.total === 1 ? "" : "s"} in this category.
        </p>

        <div className="mt-6 space-y-4">
          {data?.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {data && data.jobs.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No vacancies in this category right now. Check back soon or browse all jobs.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Link
            to="/jobs"
            search={{ category }}
            className="flex w-full items-center justify-center rounded-lg bg-card py-3 text-sm font-bold ring-1 ring-border"
          >
            Refine with filters
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
