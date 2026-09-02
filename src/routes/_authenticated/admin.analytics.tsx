import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminShell } from "@/components/admin-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  jobsCol,
  pageEventsCol,
  fbQuery,
  fbWhere,
  fbGetDocs,
  fbLimit,
  fbDocumentId,
  type Job,
  type PageEvent,
} from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Traffic Analytics — SA Career Hub Admin" },
      { name: "description", content: "Site traffic and vacancy performance for SA Career Hub." },
      { property: "og:title", content: "Traffic Analytics — SA Career Hub Admin" },
      {
        property: "og:description",
        content: "Internal traffic and vacancy performance reporting.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnalytics,
});

type SiteAnalytics = {
  totals: {
    views: number;
    job_views: number;
    apply_clicks: number;
    visitors: number;
    sessions: number;
  };
  daily: { day: string; views: number; visitors: number; apply_clicks: number }[];
  top_pages: { path: string; views: number }[];
  top_referrers: { referrer: string; views: number }[];
  top_provinces: { province: string; views: number }[];
  top_categories: { category: string; views: number }[];
};

type JobRow = {
  job_id: string;
  title: string;
  status: string;
  views: number;
  apply_clicks: number;
  posted_at: string;
};

const RANGES = [7, 30, 90] as const;

function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function RankList({ rows }: { rows: { label: string; value: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-foreground">{r.label}</span>
          <span className="shrink-0 font-semibold text-navy">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

async function fetchSiteAnalytics(days: number): Promise<SiteAnalytics> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const q = fbQuery(pageEventsCol(), fbWhere("created_at", ">=", since), fbLimit(20000));
  const snap = await fbGetDocs(q);
  const events: PageEvent[] = [];
  snap.forEach((d) =>
    events.push({
      id: d.id,
      ...d.data(),
    }),
  );

  const totals = { views: 0, job_views: 0, apply_clicks: 0, visitors: 0, sessions: 0 };
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const byDay = new Map<string, { views: number; visitors: Set<string>; apply_clicks: number }>();
  const pages = new Map<string, number>();
  const referrers = new Map<string, number>();
  const provinces = new Map<string, number>();
  const categories = new Map<string, number>();

  for (const e of events) {
    if (e.visitor_hash) visitors.add(e.visitor_hash);
    if (e.session_id) sessions.add(e.session_id);

    const d = new Date(e.created_at || new Date().toISOString());
    const dayKey = d.toISOString().slice(0, 10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, { views: 0, visitors: new Set(), apply_clicks: 0 });
    const day = byDay.get(dayKey)!;

    if (e.event_type === "page_view") {
      totals.views++;
      day.views++;
      if (e.visitor_hash) day.visitors.add(e.visitor_hash);
      if (e.path) pages.set(e.path, (pages.get(e.path) ?? 0) + 1);
      if (e.referrer) referrers.set(e.referrer, (referrers.get(e.referrer) ?? 0) + 1);
      if (e.province) provinces.set(e.province, (provinces.get(e.province) ?? 0) + 1);
      if (e.category) categories.set(e.category, (categories.get(e.category) ?? 0) + 1);
    } else if (e.event_type === "job_view") {
      totals.job_views++;
      totals.views++;
      day.views++;
      if (e.visitor_hash) day.visitors.add(e.visitor_hash);
      if (e.province) provinces.set(e.province, (provinces.get(e.province) ?? 0) + 1);
      if (e.category) categories.set(e.category, (categories.get(e.category) ?? 0) + 1);
    } else if (e.event_type === "apply_click") {
      totals.apply_clicks++;
      day.apply_clicks++;
    }
  }

  totals.visitors = visitors.size;
  totals.sessions = sessions.size;

  const start = new Date(Date.now() - (days - 1) * 86400000);
  start.setHours(0, 0, 0, 0);
  const daily: SiteAnalytics["daily"] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    const entry = byDay.get(k);
    daily.push({
      day: k,
      views: entry?.views ?? 0,
      visitors: entry?.visitors.size ?? 0,
      apply_clicks: entry?.apply_clicks ?? 0,
    });
  }

  function topN(map: Map<string, number>, n = 10) {
    return [...map.entries()]
      .filter(([k]) => k)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  return {
    totals,
    daily,
    top_pages: topN(pages).map(([path, views]) => ({ path, views })),
    top_referrers: topN(referrers).map(([referrer, views]) => ({ referrer, views })),
    top_provinces: topN(provinces).map(([province, views]) => ({ province, views })),
    top_categories: topN(categories).map(([category, views]) => ({ category, views })),
  };
}

async function fetchJobAnalytics(days: number): Promise<JobRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const q = fbQuery(pageEventsCol(), fbWhere("created_at", ">=", since), fbLimit(20000));
  const snap = await fbGetDocs(q);

  const counts = new Map<string, { views: number; apply_clicks: number }>();
  snap.forEach((d) => {
    const e = d.data();
    if (!e.job_id) return;
    if (!counts.has(e.job_id)) counts.set(e.job_id, { views: 0, apply_clicks: 0 });
    const c = counts.get(e.job_id)!;
    if (e.event_type === "job_view") c.views++;
    if (e.event_type === "apply_click") c.apply_clicks++;
  });

  if (counts.size === 0) return [];

  const ids = [...counts.keys()];
  const jobsMap = new Map<string, { title: string; status: string; posted_at: string }>();
  const BATCH = 10;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const jobQ = fbQuery(jobsCol(), fbWhere(fbDocumentId(), "in", slice), fbLimit(slice.length));
    let jobSnap;
    try {
      jobSnap = await fbGetDocs(jobQ);
    } catch {
      continue;
    }
    jobSnap.forEach((d) => {
      const data = d.data();
      jobsMap.set(d.id, { title: data.title ?? "Untitled", status: data.status ?? "unknown", posted_at: data.posted_at ?? "" });
    });
  }

  const result: JobRow[] = [];
  for (const [job_id, c] of counts.entries()) {
    const jobInfo = jobsMap.get(job_id);
    if (!jobInfo) continue;
    result.push({
      job_id,
      title: jobInfo.title,
      status: jobInfo.status,
      views: c.views,
      apply_clicks: c.apply_clicks,
      posted_at: jobInfo.posted_at,
    });
  }
  return result;
}

function AdminAnalytics() {
  const [days, setDays] = useState<number>(30);
  const [sort, setSort] = useState<"views" | "apply_clicks" | "rate">("views");

  const site = useQuery({
    queryKey: ["site-analytics", days],
    queryFn: () => fetchSiteAnalytics(days),
  });

  const jobs = useQuery({
    queryKey: ["job-analytics", days],
    queryFn: () => fetchJobAnalytics(days),
  });

  const totals = site.data?.totals;
  const cards = [
    { label: "Page views", value: totals?.views ?? 0 },
    { label: "Unique visitors", value: totals?.visitors ?? 0 },
    { label: "Vacancy views", value: totals?.job_views ?? 0 },
    { label: "Apply clicks", value: totals?.apply_clicks ?? 0 },
    { label: "Apply rate", value: pct(totals?.apply_clicks ?? 0, totals?.job_views ?? 0) },
  ];

  const jobRows = (Array.isArray(jobs.data) ? [...jobs.data] : []).sort((a, b) => {
    if (sort === "rate") {
      const ra = a.views ? a.apply_clicks / a.views : 0;
      const rb = b.views ? b.apply_clicks / b.views : 0;
      return rb - ra;
    }
    return b[sort] - a[sort];
  });

  return (
    <AdminShell
      title="Traffic analytics"
      action={
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                days === r
                  ? "border-navy bg-navy text-primary-foreground"
                  : "border-input hover:bg-accent"
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      }
    >
      {site.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load analytics.
        </p>
      )}

      {site.isLoading ? (
        <LoadingSpinner label="Loading analytics…" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-2xl font-bold text-navy">{c.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {!site.isLoading && (
        <div className="mt-4">
          <Panel title={`Daily traffic — last ${days} days`}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={site.data?.daily ?? []}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="hsl(var(--navy))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke="hsl(var(--gold))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="apply_clicks"
                    name="Apply clicks"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {!site.isLoading && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Panel title="Top pages">
            <RankList
              rows={(site.data?.top_pages ?? []).map((p) => ({ label: p.path, value: p.views }))}
            />
          </Panel>
          <Panel title="Top referrers">
            <RankList
              rows={(site.data?.top_referrers ?? []).map((r) => ({
                label: r.referrer,
                value: r.views,
              }))}
            />
          </Panel>
          <Panel title="Top provinces">
            <RankList
              rows={(site.data?.top_provinces ?? []).map((p) => ({
                label: p.province,
                value: p.views,
              }))}
            />
          </Panel>
          <Panel title="Top categories">
          <RankList
            rows={(site.data?.top_categories ?? []).map((c) => ({
              label: c.category,
              value: c.views,
            }))}
          />
        </Panel>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Vacancy performance
          </h2>
          <div className="flex gap-1.5 text-xs">
            {(
              [
                ["views", "Views"],
                ["apply_clicks", "Apply clicks"],
                ["rate", "Apply rate"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`rounded border px-2 py-1 font-medium ${
                  sort === key
                    ? "border-navy bg-navy text-primary-foreground"
                    : "border-input hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {jobs.isLoading && (
          <div className="p-4">
            <LoadingSpinner label="Loading vacancy performance…" />
          </div>
        )}
        {!jobs.isLoading && jobRows.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No vacancy data for this period yet.</p>
        )}

        {jobRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Vacancy</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Views</th>
                  <th className="p-3 text-right">Apply clicks</th>
                  <th className="p-3 text-right">Apply rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobRows.map((j) => (
                  <tr key={j.job_id}>
                    <td className="p-3 font-medium text-foreground">{j.title}</td>
                    <td className="p-3 text-xs uppercase text-muted-foreground">{j.status}</td>
                    <td className="p-3 text-right font-semibold">{j.views}</td>
                    <td className="p-3 text-right font-semibold">{j.apply_clicks}</td>
                    <td className="p-3 text-right">{pct(j.apply_clicks, j.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
