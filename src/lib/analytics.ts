import { pageEventsCol, fbAddDoc, type PageEvent } from "@/integrations/firebase/client";

const VISITOR_KEY = "sa-jobs-visitor";
const SESSION_KEY = "sa-jobs-session";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function visitorId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function sessionId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/* ---------------------------------- GA4 ---------------------------------- */

const measurementId = import.meta.env["VITE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
  string | undefined;
let gaReady = false;

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initGoogleAnalytics() {
  if (typeof window === "undefined" || gaReady || !measurementId) return;
  gaReady = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: false });
}

export function trackGaEvent(name: string, params: Record<string, unknown> = {}) {
  if (!measurementId) return;
  gtag("event", name, params);
}

/* ----------------------------- Internal events ---------------------------- */

type EventInput = {
  event_type: "page_view" | "job_view" | "apply_click";
  path?: string;
  job_id?: string | null;
  province?: string;
  category?: string;
};

const seen = new Set<string>();

export function trackEvent(input: EventInput) {
  if (typeof window === "undefined") return;
  const path = input.path ?? window.location.pathname;

  if (path.startsWith("/admin") || path.startsWith("/auth")) return;
  const key = `${input.event_type}:${path}:${input.job_id ?? ""}`;
  if (input.event_type !== "apply_click") {
    if (seen.has(key)) return;
    seen.add(key);
  }

  const payload: Omit<PageEvent, "id" | "created_at"> = {
    event_type: input.event_type,
    path,
    job_id: input.job_id ?? null,
    referrer: document.referrer ? new URL(document.referrer).hostname : "",
    visitor_hash: visitorId(),
    session_id: sessionId(),
    province: input.province ?? "",
    category: input.category ?? "",
  };

  void fbAddDoc(pageEventsCol(), {
    ...payload,
    created_at: new Date().toISOString(),
  } as PageEvent).then(undefined, () => undefined);
}

export function trackPageView(path: string) {
  initGoogleAnalytics();
  trackGaEvent("page_view", { page_path: path, page_location: window.location.href });
  trackEvent({ event_type: "page_view", path });
}

export function trackJobView(
  job: { id: string; title: string; province: string; category: string },
  path: string,
) {
  trackGaEvent("view_job", {
    job_id: job.id,
    job_title: job.title,
    province: job.province,
    category: job.category,
  });
  trackEvent({
    event_type: "job_view",
    path,
    job_id: job.id,
    province: job.province,
    category: job.category,
  });
}

export function trackApplyClick(job: {
  id: string;
  title: string;
  province: string;
  category: string;
}) {
  trackGaEvent("apply_click", { job_id: job.id, job_title: job.title });
  trackEvent({
    event_type: "apply_click",
    job_id: job.id,
    province: job.province,
    category: job.category,
  });
}
