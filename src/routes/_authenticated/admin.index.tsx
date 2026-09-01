import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import {
  jobsCol,
  pageEventsCol,
  fbQuery,
  fbWhere,
  fbOrderBy,
  fbLimit,
  fbGetDocs,
  fbAddDoc,
  fbUpdateDoc,
  fbDeleteDoc,
  fbDoc,
  type Job,
  type JobData,
} from "@/integrations/firebase/client";
import { formatDate, isExpired, slugify } from "@/lib/sa-jobs";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Vacancy Dashboard — SA Jobs Admin" },
      { name: "description", content: "Manage published, draft and archived SA Jobs vacancies." },
      { property: "og:title", content: "Vacancy Dashboard — SA Jobs Admin" },
      {
        property: "og:description",
        content: "Internal dashboard for managing SA Jobs vacancy listings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

async function fetchAllJobs(): Promise<Job[]> {
  const q = fbQuery(jobsCol(), fbOrderBy("updated_at", "desc"), fbLimit(200));
  const snap = await fbGetDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

type JobStats = { views: number; apply_clicks: number };

async function fetchJobAnalytics(days: number): Promise<Record<string, JobStats>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const q = fbQuery(pageEventsCol(), fbWhere("created_at", ">=", since), fbLimit(5000));
  let snap;
  try {
    snap = await fbGetDocs(q);
  } catch {
    return {};
  }
  const map: Record<string, JobStats> = {};
  for (const d of snap.docs) {
    const evt = d.data();
    const jobId = evt.job_id;
    if (!jobId) continue;
    if (!map[jobId]) map[jobId] = { views: 0, apply_clicks: 0 };
    if (evt.event_type === "job_view" || evt.event_type === "page_view") {
      if (evt.event_type === "job_view") map[jobId].views++;
    }
    if (evt.event_type === "apply_click") map[jobId].apply_clicks++;
  }
  return map;
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["admin-jobs"], queryFn: fetchAllJobs });
  const { data: analytics = {} } = useQuery({
    queryKey: ["job-analytics", 30],
    queryFn: () => fetchJobAnalytics(30),
  });

  const mutate = useMutation({
    mutationFn: async (action: { type: string; job: Job }) => {
      const { job, type } = action;
      if (type === "delete") {
        await fbDeleteDoc(fbDoc(jobsCol(), job.id));
        return "Vacancy deleted";
      }
      if (type === "duplicate") {
        const { id, created_at, updated_at, ...rest } = job;
        const now = new Date().toISOString();
        await fbAddDoc(jobsCol(), {
          ...rest,
          title: `${job.title} (copy)`,
          slug: `${slugify(job.title)}-${Date.now().toString(36)}`,
          status: "draft",
          created_at: now,
          updated_at: now,
        } satisfies JobData);
        return "Vacancy duplicated as a draft";
      }
      const patch: Partial<JobData> =
        type === "publish"
          ? { status: job.status === "published" ? "draft" : "published" }
          : type === "featured"
            ? { featured: !job.featured }
            : type === "urgent"
              ? { urgent: !job.urgent }
              : { status: "archived" };
      await fbUpdateDoc(fbDoc(jobsCol(), job.id), {
        ...patch,
        updated_at: new Date().toISOString(),
      } satisfies Partial<JobData>);
      return "Vacancy updated";
    },
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

  const stats = [
    { label: "Total vacancies", value: jobs.length },
    { label: "Published", value: jobs.filter((j) => j.status === "published").length },
    { label: "Drafts", value: jobs.filter((j) => j.status === "draft").length },
    { label: "Featured", value: jobs.filter((j) => j.featured).length },
    { label: "Closed", value: jobs.filter((j) => isExpired(j)).length },
  ];

  return (
    <AdminShell
      title="Vacancy dashboard"
      action={
        <Link
          to="/admin/jobs/$id"
          params={{ id: "new" }}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-soft"
        >
          Post a vacancy
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-2xl font-bold text-navy">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card shadow-sm">
        {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading vacancies…</p>}
        {error && (
          <p className="p-5 text-sm text-destructive">
            Could not load vacancies. Your account may not have administrator rights yet.
          </p>
        )}
        {!isLoading && !error && jobs.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No vacancies captured yet.</p>
        )}
        <ul className="divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        job.status === "published"
                          ? "bg-navy text-primary-foreground"
                          : job.status === "draft"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {job.status}
                    </span>
                    {job.featured && (
                      <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy">
                        Featured
                      </span>
                    )}
                    {job.urgent && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-semibold text-foreground">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.company} · {job.city ? `${job.city}, ` : ""}
                    {job.province} · Closes {formatDate(job.closing_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {analytics[job.id]?.views ?? 0} views · {analytics[job.id]?.apply_clicks ?? 0}{" "}
                    apply clicks (30 days)
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Link
                    to="/admin/jobs/$id"
                    params={{ id: job.id }}
                    className="rounded border border-input px-2 py-1 font-medium hover:bg-accent"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => mutate.mutate({ type: "publish", job })}
                    className="rounded border border-input px-2 py-1 font-medium hover:bg-accent"
                  >
                    {job.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => mutate.mutate({ type: "featured", job })}
                    className="rounded border border-input px-2 py-1 font-medium hover:bg-accent"
                  >
                    {job.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    onClick={() => mutate.mutate({ type: "urgent", job })}
                    className="rounded border border-input px-2 py-1 font-medium hover:bg-accent"
                  >
                    {job.urgent ? "Not urgent" : "Mark urgent"}
                  </button>
                  <button
                    onClick={() => mutate.mutate({ type: "duplicate", job })}
                    className="rounded border border-input px-2 py-1 font-medium hover:bg-accent"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${job.title}"? This cannot be undone.`)) {
                        mutate.mutate({ type: "delete", job });
                      }
                    }}
                    className="rounded border border-destructive/40 px-2 py-1 font-medium text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
