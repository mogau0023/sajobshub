import {
  jobsCol,
  fbQuery,
  fbWhere,
  fbOrderBy,
  fbLimit,
  fbGetDocs,
  fbOr,
  fbAnd,
  fbGetCount,
  type Job,
  type JobData,
} from "@/integrations/firebase/client";
import type {
  DocumentSnapshot,
  QueryConstraint,
  QueryCompositeFilterConstraint,
  QueryNonFilterConstraint,
} from "firebase/firestore";

export type JobFilters = {
  q?: string | undefined;
  province?: string | undefined;
  city?: string | undefined;
  category?: string | undefined;
  type?: string | undefined;
  experience?: string | undefined;
  education?: string | undefined;
  salary?: string | undefined;
  posted?: string | undefined;
  sort?: string | undefined;
  page?: number | undefined;
};

export const PAGE_SIZE = 10;

function toPrefixArr(term: string): string[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return t.split(/\s+/).filter(Boolean);
}

function containsText(job: Job, term: string): boolean {
  const tokens = toPrefixArr(term);
  if (tokens.length === 0) return true;
  const haystack = [job.title || "", job.company || "", job.description || "", job.city || ""]
    .join(" ")
    .toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

export function isExpiredClosing(closingDate: string | null, refMs?: number): boolean {
  if (!closingDate) return false;
  const ref = refMs ?? (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  })();
  return new Date(closingDate).getTime() < ref;
}

function todayIso(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.toISOString();
}

function expirationOrFilter() {
  const iso = todayIso();
  return fbOr(fbWhere("closing_date", "==", null), fbWhere("closing_date", ">=", iso));
}

// Returns a composite AND filter containing the status + expiration logic.
// Callers that need to avoid OR/composite conflicts (e.g. queries that already have
// fbAnd / multiple orderBys) should instead use publishedOnlyBaseConstraints() and sweep
// expired jobs in memory with sweepExpiredJobs().
export function baseConstraintsWithExpiration(): QueryCompositeFilterConstraint {
  return fbAnd(fbWhere("status", "==", "published"), expirationOrFilter());
}

// Returns only the plain published where. Used as fallback when OR composite filters
// would conflict with the query's ordering.
export function publishedOnlyBaseConstraints(): QueryConstraint[] {
  return [fbWhere("status", "==", "published")];
}

export function sweepExpiredJobs<T extends { closing_date: string | null }>(
  jobs: T[],
): T[] {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const refMs = t.getTime();
  return jobs.filter((j) => !isExpiredClosing(j.closing_date, refMs));
}



export async function fetchJobs(filters: JobFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const extraFilters: QueryConstraint[] = [];
  if (filters.province) extraFilters.push(fbWhere("province", "==", filters.province));
  if (filters.category) extraFilters.push(fbWhere("category", "==", filters.category));
  if (filters.type) extraFilters.push(fbWhere("employment_type", "==", filters.type));
  if (filters.experience)
    extraFilters.push(fbWhere("experience_level", "==", filters.experience));
  if (filters.education)
    extraFilters.push(fbWhere("education_requirement", "==", filters.education));
  if (filters.city) {
    const cl = filters.city.toLowerCase();
    extraFilters.push(fbWhere("city", ">=", cl));
    extraFilters.push(fbWhere("city", "<", cl + "\uf8ff"));
  }
  if (filters.salary) {
    const [min, max] = filters.salary.split("-").map(Number);
    if (!Number.isNaN(min)) extraFilters.push(fbWhere("salary_max", ">=", min));
    if (!Number.isNaN(max)) extraFilters.push(fbWhere("salary_min", "<=", max));
  }
  if (filters.posted) {
    const days = Number(filters.posted);
    if (!Number.isNaN(days)) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      extraFilters.push(fbWhere("posted_at", ">=", since));
    }
  }

  const orderConstraints: QueryNonFilterConstraint[] = [];
  if (filters.sort === "closing") {
    orderConstraints.push(fbOrderBy("closing_date", "asc"));
  } else {
    orderConstraints.push(fbOrderBy("featured", "desc"));
    orderConstraints.push(fbOrderBy("posted_at", "desc"));
  }

  const textTerm = filters.q ? filters.q.replace(/[%,()]/g, " ").trim() : "";
  const fetchLimit = Math.min(500, page * PAGE_SIZE * 3 + 200);

  // Strategy: because OR + multiple orderBys require a custom compound index we can't
  // guarantee at runtime, we prefer the plain published filter + memory sweep. The
  // expiration OR is only used in count queries where it is known to succeed on its own.
  const primaryConstraints: QueryConstraint[] = [
    ...publishedOnlyBaseConstraints(),
    ...extraFilters,
    ...(orderConstraints as QueryConstraint[]),
    fbLimit(fetchLimit),
  ];

  let total = 0;
  let totalSweepRequired = false;
  // Count with expiration OR composite filter first.
  try {
    // Pass composite filter first, then regular where constraints.
    const compositeFilter = baseConstraintsWithExpiration();
    const countQuery = fbQuery(
      jobsCol(),
      compositeFilter as unknown as QueryConstraint,
      ...extraFilters,
    );
    const snap = await fbGetCount(countQuery);
    total = snap.data().count ?? 0;
  } catch (err) {
    console.error("[fetchJobs] count query with expiration OR failed, falling back:", err);
    totalSweepRequired = true;
    try {
      const fallbackCountQuery = fbQuery(
        jobsCol(),
        ...publishedOnlyBaseConstraints(),
        ...extraFilters,
      );
      const snap = await fbGetCount(fallbackCountQuery);
      total = snap.data().count ?? 0;
    } catch (countErr) {
      console.error("[fetchJobs] fallback count query failed:", countErr);
      total = 0;
    }
  }

  let docs: (Job & { _snap: DocumentSnapshot })[] = [];
  let docsFetched = false;

  try {
    const dataQuery = fbQuery(jobsCol(), ...primaryConstraints);
    const snap = await fbGetDocs(dataQuery);
    docs = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, _snap: d } as Job & { _snap: DocumentSnapshot };
    });
    docsFetched = true;
  } catch (err) {
    console.error("[fetchJobs] primary data query failed (missing index?):", err);
  }

  if (!docsFetched) {
    try {
      const noOrder: QueryConstraint[] = [
        ...publishedOnlyBaseConstraints(),
        ...extraFilters,
        fbLimit(fetchLimit),
      ];
      const snap = await fbGetDocs(fbQuery(jobsCol(), ...noOrder));
      docs = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, _snap: d } as Job & { _snap: DocumentSnapshot };
      });
      if (filters.sort === "closing") {
        docs.sort((a, b) => {
          const ad = a.closing_date ? new Date(a.closing_date).getTime() : Infinity;
          const bd = b.closing_date ? new Date(b.closing_date).getTime() : Infinity;
          return ad - bd;
        });
      } else {
        docs.sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          const ap = a.posted_at ? new Date(a.posted_at).getTime() : 0;
          const bp = b.posted_at ? new Date(b.posted_at).getTime() : 0;
          return bp - ap;
        });
      }
      docsFetched = true;
    } catch (fallbackErr) {
      console.error("[fetchJobs] fallback data query also failed:", fallbackErr);
      return { jobs: [], total, page };
    }
  }

  // Always sweep expired jobs in memory (our primary path above uses
  // publishedOnlyBaseConstraints + orderBy to avoid composite-index failures).
  const beforeCount = docs.length;
  docs = sweepExpiredJobs(docs);
  if (totalSweepRequired || docs.length < beforeCount) {
    // Adjust total downward: expired were counted but not shown. If the whole page is swept
    // we scale by the sample ratio; otherwise we just reduce by what we removed from this page.
    const removedFromPage = beforeCount - docs.length;
    total = Math.max(0, total - removedFromPage);
  }

  if (textTerm) {
    docs = docs.filter((j) => containsText(j, textTerm));
  }

  const from = (page - 1) * PAGE_SIZE;
  const paged = docs.slice(from, from + PAGE_SIZE).map(({ _snap, ...rest }) => rest as Job);
  const adjustedTotal = textTerm && total > docs.length ? docs.length : total;

  return { jobs: paged, total: adjustedTotal, page };
}

export async function fetchJobBySlug(slug: string): Promise<Job | null> {
  const basicQ = fbQuery(
    jobsCol(),
    fbWhere("slug", "==", slug),
    fbWhere("status", "==", "published"),
    fbLimit(1),
  );
  const snap = await fbGetDocs(basicQ);
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  const job = { id: d.id, ...d.data() } as Job;
  // Treat expired vacancies as not-found so they 404 and are hidden from search engines.
  if (isExpiredClosing(job.closing_date)) return null;
  return job;
}

export async function fetchRelatedJobs(job: Job): Promise<Job[]> {
  try {
    const filter: QueryCompositeFilterConstraint = fbAnd(
      fbWhere("status", "==", "published"),
      fbOr(fbWhere("category", "==", job.category), fbWhere("province", "==", job.province)),
    );
    const q = fbQuery(jobsCol(), filter, fbOrderBy("posted_at", "desc"), fbLimit(15));
    const snap = await fbGetDocs(q);
    const all: Job[] = [];
    for (const d of snap.docs) {
      if (d.id === job.id) continue;
      all.push({ id: d.id, ...d.data() } as Job);
    }
    return sweepExpiredJobs(all).slice(0, 4);
  } catch {
    return [];
  }
}

export async function fetchLatestJobs(limit = 8): Promise<Job[]> {
  try {
    // Combined ORDER BY (featured + posted_at) + OR expiration filter would require a custom
    // compound index, so fetch a larger window and sweep expired ones in-memory.
    const fetchLimit = Math.max(limit * 2, limit + 10);
    const q = fbQuery(
      jobsCol(),
      fbWhere("status", "==", "published"),
      fbOrderBy("featured", "desc"),
      fbOrderBy("posted_at", "desc"),
      fbLimit(fetchLimit),
    );
    const snap = await fbGetDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
    return sweepExpiredJobs(all).slice(0, limit);
  } catch (err) {
    console.error("[fetchLatestJobs] failed:", err);
    return [];
  }
}

export async function fetchPublishedCount(): Promise<number> {
  try {
    const q = fbQuery(jobsCol(), baseConstraintsWithExpiration());
    const snap = await fbGetCount(q);
    return snap.data().count ?? 0;
  } catch (err) {
    console.error("[fetchPublishedCount] OR query failed, falling back:", err);
    // Fallback: count without OR filter, then sweep a limited sample.
    const fallbackQ = fbQuery(jobsCol(), fbWhere("status", "==", "published"));
    try {
      const snap = await fbGetCount(fallbackQ);
      const sampleQ = fbQuery(
        jobsCol(),
        fbWhere("status", "==", "published"),
        fbLimit(500),
      );
      const sampleSnap = await fbGetDocs(sampleQ);
      const samples = sampleSnap.docs.map((d) => ({
        closing_date: (d.data().closing_date ?? null) as string | null,
      }));
      const active = sweepExpiredJobs(samples).length;
      const ratio = samples.length > 0 ? active / samples.length : 1;
      return Math.round((snap.data().count ?? 0) * ratio);
    } catch (fallbackErr) {
      console.error("[fetchPublishedCount] fallback failed:", fallbackErr);
      return 0;
    }
  }
}

export async function fetchActiveCategories(): Promise<string[]> {
  try {
    // Use the simpler published-only filter + in-memory sweep to avoid composite-index
    // requirements that may break when no indexes exist yet for the OR + limit combo.
    const q = fbQuery(
      jobsCol(),
      ...publishedOnlyBaseConstraints(),
      fbLimit(500),
    );
    const snap = await fbGetDocs(q);
    const docs = sweepExpiredJobs(
      snap.docs.map((d) => ({
        closing_date: (d.data().closing_date ?? null) as string | null,
        category: d.data().category as string,
      })),
    );
    const seen = new Set<string>();
    for (const row of docs) {
      if (typeof row.category === "string" && row.category) seen.add(row.category);
    }
    return Array.from(seen);
  } catch (err) {
    console.error("[fetchActiveCategories] failed:", err);
    return [];
  }
}

export async function fetchActiveProvinces(): Promise<string[]> {
  try {
    const q = fbQuery(
      jobsCol(),
      ...publishedOnlyBaseConstraints(),
      fbLimit(500),
    );
    const snap = await fbGetDocs(q);
    const docs = sweepExpiredJobs(
      snap.docs.map((d) => ({
        closing_date: (d.data().closing_date ?? null) as string | null,
        province: d.data().province as string,
      })),
    );
    const seen = new Set<string>();
    for (const row of docs) {
      if (typeof row.province === "string" && row.province) seen.add(row.province);
    }
    return Array.from(seen);
  } catch (err) {
    console.error("[fetchActiveProvinces] failed:", err);
    return [];
  }
}
