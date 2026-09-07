import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  fetchActiveCategories,
  fetchActiveProvinces,
  fetchLatestJobs,
  fetchPublishedCount,
} from "@/lib/job-queries";
import { PROVINCES, slugify } from "@/lib/sa-jobs";
import gautengImg from "@/assets/gauteng.jpg";
import westernCapeImg from "@/assets/western-cape.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SA Career Hub — Latest South African Vacancies & Learnerships" },
      {
        name: "description",
        content:
          "Browse the latest South African vacancies, government jobs, learnerships and internships. Free to search by province, city and category.",
      },
      { property: "og:title", content: "SA Career Hub — Latest South African Vacancies" },
      {
        property: "og:description",
        content:
          "Free South African job portal. Government jobs, learnerships, internships and entry-level work.",
      },
    ],
  }),
  component: Home,
});

const QUICK_FILTERS = [
  "Government Jobs",
  "Internships",
  "Learnerships",
  "No Experience Jobs",
] as const;

function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["latest-jobs"],
    queryFn: () => fetchLatestJobs(6),
  });
  const { data: publishedCount, isLoading: countLoading, error: countError } = useQuery({
    queryKey: ["jobs-count"],
    queryFn: fetchPublishedCount,
  });
  const { data: activeCategories } = useQuery({
    queryKey: ["active-categories"],
    queryFn: fetchActiveCategories,
  });
  const { data: activeProvinces } = useQuery({
    queryKey: ["active-provinces"],
    queryFn: fetchActiveProvinces,
  });
  const isLoading = jobsLoading || countLoading;
  const total =
    Array.isArray(jobs) && jobs.length > 0
      ? Math.max(publishedCount ?? 0, jobs.length)
      : publishedCount;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="bg-navy px-4 pb-8 pt-4">
        <div className="mx-auto max-w-5xl space-y-3">
          <h1 className="sr-only">
            SA Career Hub — South African vacancies, learnerships and internships
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/jobs", search: { q: keyword || undefined } });
            }}
            className="relative"
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <div className="size-4 rounded-full border-2 border-primary-foreground/40" />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              maxLength={80}
              aria-label="Search jobs"
              placeholder="Search jobs (e.g. Admin, Driver)"
              className="h-12 w-full rounded-lg border-none bg-primary-foreground/10 pl-10 text-sm text-primary-foreground ring-1 ring-primary-foreground/20 outline-none placeholder:text-primary-foreground/50 focus:bg-card focus:text-navy focus:ring-2 focus:ring-gold"
            />
          </form>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            <Link
              to="/jobs"
              className="whitespace-nowrap rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy"
            >
              All Jobs
            </Link>
            {QUICK_FILTERS.filter((cat) => activeCategories?.includes(cat)).map((cat) => (
              <Link
                key={cat}
                to="/category/$slug"
                params={{ slug: slugify(cat) }}
                className="whitespace-nowrap rounded-full bg-primary-foreground/10 px-4 py-2 text-xs font-semibold text-primary-foreground ring-1 ring-primary-foreground/20"
              >
                {cat.replace(" Jobs", "")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Latest Vacancies</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-navy border-r-transparent border-t-transparent" />
                Loading…
              </span>
            ) : (
              `${total ?? 0} job${total === 1 ? "" : "s"} available`
            )}
          </span>
        </div>

        <div className="space-y-4">
          {(jobsError || countError) && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
              Could not load vacancies. Open the browser console (F12) for details — this usually
              means a Firestore compound index is missing. Click the link in the console error to
              create it automatically.
            </p>
          )}
          {isLoading && <LoadingSpinner label="Loading latest vacancies…" />}
          {!isLoading &&
            jobs?.map((job) => <JobCard key={job.id} job={job} />)}
          {!isLoading && Array.isArray(jobs) && jobs.length === 0 && !jobsError && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              {(publishedCount ?? 0) > 0
                ? "Vacancies are being indexed — refresh in a minute or browse the All Jobs page."
                : "No vacancies have been published yet. In the admin panel, make sure each job's Status is set to 'published'."}
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/jobs"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-card py-3 font-bold shadow-sm ring-1 ring-border"
          >
            View All Vacancies
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold">Browse by Province</h2>
          <div className="grid grid-cols-2 gap-3">
            {activeProvinces?.includes("Gauteng") && (
              <Link
                to="/province/$slug"
                params={{ slug: "gauteng" }}
                className="group relative h-24 overflow-hidden rounded-lg bg-navy"
              >
                <img
                  src={gautengImg}
                  alt="Johannesburg skyline at sunset"
                  width={800}
                  height={512}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover opacity-40 grayscale"
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold uppercase text-primary-foreground">
                  Gauteng
                </span>
              </Link>
            )}
            {activeProvinces?.includes("Western Cape") && (
              <Link
                to="/province/$slug"
                params={{ slug: "western-cape" }}
                className="group relative h-24 overflow-hidden rounded-lg bg-navy"
              >
                <img
                  src={westernCapeImg}
                  alt="Table Mountain in Cape Town"
                  width={800}
                  height={512}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover opacity-40 grayscale"
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold uppercase text-primary-foreground">
                  Western Cape
                </span>
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROVINCES.filter(
              (p) =>
                p !== "Gauteng" &&
                p !== "Western Cape" &&
                activeProvinces?.includes(p),
            ).map((province) => (
              <Link
                key={province}
                to="/province/$slug"
                params={{ slug: slugify(province) }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
              >
                {province}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
