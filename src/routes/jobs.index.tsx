import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { fetchJobs, PAGE_SIZE, type JobFilters } from "@/lib/job-queries";
import {
  CATEGORIES,
  DATE_POSTED_OPTIONS,
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  PROVINCES,
  SALARY_BANDS,
} from "@/lib/sa-jobs";

type Search = JobFilters;

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const str = (key: string) =>
      typeof search[key] === "string" && search[key] ? (search[key] as string) : undefined;
    const page = Number(search["page"]);
    return {
      q: str("q"),
      province: str("province"),
      city: str("city"),
      category: str("category"),
      type: str("type"),
      experience: str("experience"),
      education: str("education"),
      salary: str("salary"),
      posted: str("posted"),
      sort: str("sort"),
      page: Number.isFinite(page) && page > 1 ? page : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Browse Jobs in South Africa — SA Jobs" },
      {
        name: "description",
        content:
          "Search verified South African vacancies by province, city, category, salary and experience level. Updated daily, free to apply.",
      },
      { property: "og:title", content: "Browse Jobs in South Africa" },
      {
        property: "og:description",
        content:
          "Filter thousands of South African vacancies, learnerships and internships by province and category.",
      },
    ],
  }),
  component: JobsPage,
});

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: readonly (string | { value: string; label: string })[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
      >
        <option value="">Any</option>
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const l = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function JobsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs/" });
  const [keyword, setKeyword] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const setFilter = (patch: Partial<Search>) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const { data, isFetching, error } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () => fetchJobs(search),
    placeholderData: keepPreviousData,
  });

  const page = data?.page ?? 1;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="bg-navy px-4 py-4">
        <form
          className="mx-auto max-w-5xl"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter({ q: keyword || undefined });
          }}
        >
          <input
            type="text"
            value={keyword}
            maxLength={80}
            aria-label="Search jobs"
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search jobs, companies or towns"
            className="h-12 w-full rounded-lg border-none bg-primary-foreground/10 px-4 text-sm text-primary-foreground ring-1 ring-primary-foreground/20 outline-none placeholder:text-primary-foreground/50 focus:bg-card focus:text-navy focus:ring-2 focus:ring-gold"
          />
        </form>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Browse Vacancies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFetching && !data
            ? "Loading vacancies…"
            : `${total} vacancy${total === 1 ? "" : "s"} found`}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold"
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </button>
          <select
            aria-label="Sort results"
            value={search.sort ?? "latest"}
            onChange={(e) =>
              setFilter({ sort: e.target.value === "latest" ? undefined : e.target.value })
            }
            className="h-9 rounded-lg border border-border bg-card px-2 text-xs font-medium"
          >
            <option value="latest">Newest first</option>
            <option value="closing">Closing soonest</option>
          </select>
          <Link
            to="/jobs"
            search={{}}
            className="ml-auto text-xs font-semibold text-muted-foreground underline"
          >
            Clear all
          </Link>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
            <Select
              label="Province"
              value={search.province}
              options={PROVINCES}
              onChange={(v) => setFilter({ province: v })}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                City
              </span>
              <input
                defaultValue={search.city ?? ""}
                maxLength={50}
                onBlur={(e) => setFilter({ city: e.target.value || undefined })}
                placeholder="Any"
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              />
            </label>
            <Select
              label="Category"
              value={search.category}
              options={CATEGORIES}
              onChange={(v) => setFilter({ category: v })}
            />
            <Select
              label="Job type"
              value={search.type}
              options={EMPLOYMENT_TYPES}
              onChange={(v) => setFilter({ type: v })}
            />
            <Select
              label="Experience"
              value={search.experience}
              options={EXPERIENCE_LEVELS}
              onChange={(v) => setFilter({ experience: v })}
            />
            <Select
              label="Education"
              value={search.education}
              options={EDUCATION_LEVELS}
              onChange={(v) => setFilter({ education: v })}
            />
            <Select
              label="Salary"
              value={search.salary}
              options={SALARY_BANDS}
              onChange={(v) => setFilter({ salary: v })}
            />
            <Select
              label="Date posted"
              value={search.posted}
              options={DATE_POSTED_OPTIONS}
              onChange={(v) => setFilter({ posted: v })}
            />
          </div>
        )}

        <div className="mt-6 space-y-4">
          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
              Could not load vacancies. Open the browser console (F12) for details — this usually
              means a Firestore compound index is missing. Click the link in the console error to
              create it automatically.
            </p>
          )}
          {data?.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {data && data.jobs.length === 0 && !error && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No vacancies match your search. Try removing a filter or check in the admin panel
              that the job's Status is set to 'published'.
            </p>
          )}
        </div>

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            <button
              disabled={page <= 1}
              onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, page: page - 1 }) })}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, page: page + 1 }) })}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
