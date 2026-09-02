import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard } from "@/components/job-card";
import { LoadingSpinner, SpinnerOnly } from "@/components/loading-spinner";
import { jobReportsCol, fbAddDoc } from "@/integrations/firebase/client";
import { fetchJobBySlug, fetchRelatedJobs } from "@/lib/job-queries";
import { trackApplyClick, trackJobView } from "@/lib/analytics";
import { CompanyLogo } from "@/components/company-logo";
import {
  applyDestination,
  daysLeft,
  formatDate,
  isExpired,
  SITE_URL,
  type Job,
} from "@/lib/sa-jobs";

export const Route = createFileRoute("/jobs/$slug")({
  loader: async ({ params }) => {
    const job = await fetchJobBySlug(params.slug);
    if (!job) throw notFound();
    return { job };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Vacancy unavailable — SA Career Hub" }, { name: "robots", content: "noindex" }],
      };
    }
    const { job } = loaderData;
    const title = `${job.title} at ${job.company} — ${job.city || job.province} | SA Career Hub`;
    const description = `${job.employment_type} vacancy: ${job.title} at ${job.company} in ${
      job.city ? `${job.city}, ` : ""
    }${job.province}. Closing ${formatDate(job.closing_date)}. Apply free on SA Career Hub.`;
    const url = `${SITE_URL}/jobs/${params.slug}`;
    const image =
      job.company_logo_url && /^https:\/\//.test(job.company_logo_url)
        ? job.company_logo_url
        : `${SITE_URL}/og-default.jpg`;
    return {
      meta: [
        { title: title.slice(0, 120) },
        { name: "description", content: description.slice(0, 158) },
        { property: "og:title", content: title.slice(0, 120) },
        { property: "og:description", content: description.slice(0, 158) },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: JobDetail,
  notFoundComponent: JobNotFound,
});

function JobNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Vacancy not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This vacancy may have closed or been removed. Browse current openings instead.
        </p>
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

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base font-bold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
        {body
          .split(/\n+/)
          .filter(Boolean)
          .map((line, i) => (
            <p key={i} className={line.trim().startsWith("-") ? "pl-4" : ""}>
              {line.replace(/^-\s*/, "• ")}
            </p>
          ))}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value || "Not specified"}</div>
    </div>
  );
}

function ReportDialog({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Suspected scam");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-muted-foreground underline"
      >
        Report this vacancy
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await fbAddDoc(jobReportsCol(), {
            job_id: job.id,
            reason,
            details,
            reporter_email: email,
            created_at: new Date().toISOString(),
          });
          toast.success("Thank you — our team will review this vacancy.");
          setOpen(false);
          setDetails("");
        } catch {
          toast.error("Could not send your report. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-display text-sm font-bold">Report this vacancy</h3>
      <select
        aria-label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
      >
        {[
          "Suspected scam",
          "Vacancy has closed",
          "Asks for payment",
          "Incorrect details",
          "Other",
        ].map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Tell us more (optional)"
        className="w-full rounded-lg border border-border bg-background p-2 text-sm"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={120}
        placeholder="Your email (optional)"
        className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-lg bg-navy px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Submit report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-xs font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}

function JobDetail() {
  const { job } = Route.useLoaderData();

  useEffect(() => {
    trackJobView(job, `/jobs/${job.slug}`);
  }, [job]);

  const expired = isExpired(job);
  const left = daysLeft(job.closing_date);
  const destination = applyDestination(job);

  const { data: related, isLoading: relatedLoading } = useQuery({
    queryKey: ["related-jobs", job.id],
    queryFn: () => fetchRelatedJobs(job),
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.posted_at,
    validThrough: job.closing_date ?? undefined,
    employmentType: job.employment_type.toUpperCase().replace("-", "_"),
    ...(job.company_logo_url ? { image: job.company_logo_url } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(job.company_logo_url ? { logo: job.company_logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city || job.province,
        addressRegion: job.province,
        addressCountry: "ZA",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <Link to="/jobs" className="underline">
            Jobs
          </Link>{" "}
          / <span>{job.title}</span>
        </nav>

        <header className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {job.featured && (
              <span className="rounded bg-gold px-2 py-1 text-[10px] font-bold uppercase text-navy">
                Featured
              </span>
            )}
            {job.urgent && (
              <span className="rounded bg-destructive px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                Urgent
              </span>
            )}
            <span className="rounded bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-navy">
              {job.category}
            </span>
          </div>
          <div className="mt-3 flex items-start gap-4">
            <CompanyLogo company={job.company} src={job.company_logo_url} size="lg" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight">{job.title}</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {job.company} • {job.city ? `${job.city}, ` : ""}
                {job.province}
              </p>
            </div>
          </div>

          {expired ? (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              Applications for this vacancy have closed.
            </p>
          ) : (
            <>
              {destination ? (
                <a
                  href={destination}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => trackApplyClick(job)}
                  className="mt-4 flex w-full items-center justify-center rounded-lg bg-gold py-3 text-sm font-bold text-navy"
                >
                  Apply Now
                </a>
              ) : (
                <p className="mt-4 rounded-lg bg-secondary p-3 text-sm">
                  Follow the application instructions below to apply.
                </p>
              )}
              {left !== null && left <= 7 && left >= 0 && (
                <p className="mt-2 text-center text-xs font-semibold text-destructive">
                  {left === 0 ? "Closes today" : `Closes in ${left} day${left === 1 ? "" : "s"}`}
                </p>
              )}
            </>
          )}
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Fact label="Employment type" value={job.employment_type} />
          <Fact label="Experience" value={job.experience_level} />
          <Fact label="Education" value={job.education_requirement} />
          <Fact label="Salary" value={job.salary} />
          <Fact label="Reference" value={job.reference_number} />
          <Fact label="Closing date" value={formatDate(job.closing_date)} />
        </div>

        <div className="mt-6 space-y-6 rounded-xl border border-border bg-card p-5">
          <Section title="Job description" body={job.description} />
          <Section title="Key responsibilities" body={job.responsibilities} />
          <Section title="Requirements" body={job.requirements} />
          <Section title="Qualifications" body={job.qualifications} />
          <Section title="Additional information" body={job.additional_information} />
          <Section title="How to apply" body={job.how_to_apply} />

          {job.application_email && (
            <p className="text-sm">
              Send applications to{" "}
              <a className="font-semibold underline" href={`mailto:${job.application_email}`}>
                {job.application_email}
              </a>
            </p>
          )}
          {job.source_url && (
            <p className="text-xs text-muted-foreground">
              Source:{" "}
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline"
              >
                original vacancy posting
              </a>
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({ title: job.title, url });
                  return;
                } catch {
                  /* user cancelled */
                }
              }
              await navigator.clipboard.writeText(url);
              toast.success("Link copied to clipboard");
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold"
          >
            Share this job
          </button>
          <ReportDialog job={job} />
        </div>

        <p className="mt-5 rounded-lg bg-secondary p-3 text-xs text-navy">
          SA Career Hub never charges application fees. Never pay money to secure a job or an interview.
        </p>

        {(relatedLoading || (related && related.length > 0)) && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-lg font-bold">
              Related vacancies
              {relatedLoading && (
                <SpinnerOnly size="sm" className="ml-2 align-middle text-muted-foreground" />
              )}
            </h2>
            <div className="space-y-4">
              {relatedLoading && <LoadingSpinner label="Loading related vacancies…" />}
              {!relatedLoading &&
                related?.map((r) => <JobCard key={r.id} job={r} />)}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
