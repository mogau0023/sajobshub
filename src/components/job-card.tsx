import { Link } from "@tanstack/react-router";
import { CompanyLogo } from "@/components/company-logo";
import { type Job, formatDate, isExpired, timeAgo } from "@/lib/sa-jobs";

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-1.5 shrink-0 rounded-full bg-border" />
      <span className="text-xs text-muted-foreground">{children}</span>
    </div>
  );
}

export function JobCard({ job }: { job: Job }) {
  const expired = isExpired(job);

  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-card p-5 shadow-sm ${
        job.featured ? "border border-gold/30 ring-1 ring-gold/10" : "border border-border"
      }`}
    >
      {job.featured && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">
          Featured
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <CompanyLogo company={job.company} src={job.company_logo_url} />
          <div className="min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                job.urgent
                  ? "text-destructive"
                  : job.featured
                    ? "text-gold"
                    : "text-muted-foreground"
              }`}
            >
              {job.urgent ? "Urgent" : job.category}
            </span>
            <h3 className="mt-1 text-base font-bold leading-tight">
              <Link to="/jobs/$slug" params={{ slug: job.slug }} className="hover:underline">
                {job.title}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Meta>
            {job.city ? `${job.city}, ` : ""}
            {job.province}
          </Meta>
          <Meta>{job.employment_type}</Meta>
          {job.salary && <Meta>{job.salary}</Meta>}
          <Meta>{job.experience_level}</Meta>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              Posted {timeAgo(job.posted_at)}
            </span>
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              {expired ? "Applications closed" : `Closing ${formatDate(job.closing_date)}`}
            </span>
          </div>
          <Link
            to="/jobs/$slug"
            params={{ slug: job.slug }}
            className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${
              job.featured
                ? "bg-navy text-primary-foreground"
                : "border border-border bg-secondary text-navy"
            }`}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
