import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { fetchJobs } from "@/lib/job-queries";
import { PROVINCES, fromSlug } from "@/lib/sa-jobs";

export const Route = createFileRoute("/province/$slug")({
  loader: ({ params }) => {
    const province = fromSlug(params.slug, PROVINCES as unknown as string[]);
    if (!province) throw notFound();
    return { province };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Province not found — SA Jobs" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `Jobs in ${loaderData.province} — SA Jobs`;
    const description = `Current vacancies, learnerships and internships in ${loaderData.province}. Free to browse, with closing dates and direct application links.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProvincePage,
  notFoundComponent: ProvinceMissing,
});

function ProvinceMissing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">That province doesn't exist</h1>
        <Link
          to="/provinces"
          className="mt-6 inline-flex rounded-lg bg-navy px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          View all provinces
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProvincePage() {
  const { province } = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["province-jobs", province],
    queryFn: () => fetchJobs({ province }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Jobs in {province}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.total ?? 0} current vacancy{data?.total === 1 ? "" : "s"} in {province}.
        </p>

        <div className="mt-6 space-y-4">
          {data?.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {data && data.jobs.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No vacancies listed in {province} right now. Check back soon or browse all jobs.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Link
            to="/jobs"
            search={{ province }}
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
