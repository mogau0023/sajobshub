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

function baseConstraints(): QueryConstraint[] {
  return [fbWhere("status", "==", "published")];
}

export async function fetchJobs(filters: JobFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const filterConstraints: QueryConstraint[] = baseConstraints();
  const orderConstraints: QueryConstraint[] = [];

  if (filters.province) filterConstraints.push(fbWhere("province", "==", filters.province));
  if (filters.category) filterConstraints.push(fbWhere("category", "==", filters.category));
  if (filters.type) filterConstraints.push(fbWhere("employment_type", "==", filters.type));
  if (filters.experience) filterConstraints.push(fbWhere("experience_level", "==", filters.experience));
  if (filters.education)
    filterConstraints.push(fbWhere("education_requirement", "==", filters.education));
  if (filters.city) {
    const cl = filters.city.toLowerCase();
    filterConstraints.push(fbWhere("city", ">=", cl));
    filterConstraints.push(fbWhere("city", "<", cl + "\uf8ff"));
  }
  if (filters.salary) {
    const [min, max] = filters.salary.split("-").map(Number);
    if (!Number.isNaN(min)) filterConstraints.push(fbWhere("salary_max", ">=", min));
    if (!Number.isNaN(max)) filterConstraints.push(fbWhere("salary_min", "<=", max));
  }
  if (filters.posted) {
    const days = Number(filters.posted);
    if (!Number.isNaN(days)) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      filterConstraints.push(fbWhere("posted_at", ">=", since));
    }
  }

  if (filters.sort === "closing") {
    orderConstraints.push(fbOrderBy("closing_date", "asc"));
  } else {
    orderConstraints.push(fbOrderBy("featured", "desc"));
    orderConstraints.push(fbOrderBy("posted_at", "desc"));
  }

  const textTerm = filters.q ? filters.q.replace(/[%,()]/g, " ").trim() : "";

  const fetchLimit = Math.min(500, page * PAGE_SIZE * 3 + 200);

  const countQuery = fbQuery(jobsCol(), ...filterConstraints);
  let total = 0;
  try {
    const snap = await fbGetCount(countQuery);
    total = snap.data().count ?? 0;
  } catch (err) {
    console.error("[fetchJobs] count query failed:", err);
    total = 0;
  }

  const allConstraints = [...filterConstraints, ...orderConstraints];

  const dataQuery = fbQuery(jobsCol(), ...allConstraints, fbLimit(fetchLimit));
  let docs: (Job & { _snap: DocumentSnapshot })[] = [];
  let docsFetched = false;

  try {
    const snap = await fbGetDocs(dataQuery);
    docs = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, _snap: d } as Job & { _snap: DocumentSnapshot };
    });
    docsFetched = true;
  } catch (err) {
    console.error("[fetchJobs] data query with order failed (missing composite index?):", err);
  }

  if (!docsFetched) {
    try {
      const fallbackQuery = fbQuery(jobsCol(), ...filterConstraints, fbLimit(fetchLimit));
      const snap = await fbGetDocs(fallbackQuery);
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

  if (textTerm) {
    docs = docs.filter((j) => containsText(j, textTerm));
  }

  const from = (page - 1) * PAGE_SIZE;
  const paged = docs.slice(from, from + PAGE_SIZE).map(({ _snap, ...rest }) => rest as Job);
  const adjustedTotal = textTerm && total > docs.length ? docs.length : total;

  return { jobs: paged, total: adjustedTotal, page };
}

export async function fetchJobBySlug(slug: string): Promise<Job | null> {
  const q = fbQuery(jobsCol(), fbWhere("slug", "==", slug), fbWhere("status", "==", "published"), fbLimit(1));
  const snap = await fbGetDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() };
}

export async function fetchRelatedJobs(job: Job): Promise<Job[]> {
  try {
    const filter: QueryCompositeFilterConstraint = fbAnd(
      fbWhere("status", "==", "published"),
      fbOr(fbWhere("category", "==", job.category), fbWhere("province", "==", job.province)),
    );
    const q = fbQuery(jobsCol(), filter, fbOrderBy("posted_at", "desc"), fbLimit(10));
    const snap = await fbGetDocs(q);
    const result: Job[] = [];
    for (const d of snap.docs) {
      if (d.id === job.id) continue;
      if (result.length >= 4) break;
      result.push({ id: d.id, ...d.data() });
    }
    return result;
  } catch {
    return [];
  }
}

export async function fetchLatestJobs(limit = 8): Promise<Job[]> {
  const q = fbQuery(
    jobsCol(),
    fbWhere("status", "==", "published"),
    fbOrderBy("featured", "desc"),
    fbOrderBy("posted_at", "desc"),
    fbLimit(limit),
  );
  try {
    const snap = await fbGetDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("[fetchLatestJobs] failed:", err);
    return [];
  }
}

export async function fetchPublishedCount(): Promise<number> {
  const q = fbQuery(jobsCol(), fbWhere("status", "==", "published"));
  try {
    const snap = await fbGetCount(q);
    return snap.data().count ?? 0;
  } catch (err) {
    console.error("[fetchPublishedCount] failed:", err);
    return 0;
  }
}
