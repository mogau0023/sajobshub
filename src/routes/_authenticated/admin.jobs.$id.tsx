import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  jobsCol,
  fbAddDoc,
  fbUpdateDoc,
  fbDoc,
  fbGetDoc,
  getCurrentUser,
  type Job,
  type JobData,
} from "@/integrations/firebase/client";
import {
  APPLICATION_METHODS,
  CATEGORIES,
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  JOB_STATUSES,
  PROVINCES,
  slugify,
} from "@/lib/sa-jobs";

export const Route = createFileRoute("/_authenticated/admin/jobs/$id")({
  head: () => ({
    meta: [
      { title: "Vacancy Editor — SA Career Hub Admin" },
      { name: "description", content: "Capture and edit SA Career Hub vacancy listings." },
      { property: "og:title", content: "Vacancy Editor — SA Career Hub Admin" },
      {
        property: "og:description",
        content: "Internal vacancy capture form for the SA Career Hub editorial team.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JobEditor,
});

type FormState = Omit<Job, "id" | "created_at" | "updated_at" | "created_by">;

const EMPTY: FormState = {
  slug: "",
  title: "",
  company: "",
  company_logo_url: "",
  category: "General Jobs",
  province: "Gauteng",
  city: "",
  location: "",
  employment_type: "Full-Time",
  experience_level: "Entry Level",
  education_requirement: "Matric",
  salary: "",
  salary_min: null,
  salary_max: null,
  reference_number: "",
  posted_at: new Date().toISOString(),
  closing_date: null,
  description: "",
  responsibilities: "",
  requirements: "",
  qualifications: "",
  additional_information: "",
  how_to_apply: "",
  application_method: "email",
  application_email: "",
  application_url: "",
  source_url: "",
  featured: false,
  urgent: false,
  status: "draft",
};

const inputClass = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

async function getJobById(id: string): Promise<Job | null> {
  const snap = await fbGetDoc(fbDoc(jobsCol(), id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

function JobEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin-job", id],
    enabled: !isNew,
    queryFn: () => getJobById(id),
  });

  useEffect(() => {
    if (existing) {
      const {
        id: _id,
        created_at,
        updated_at,
        created_by,
        ...rest
      } = existing as Job & { created_by?: string };
      void _id;
      void created_at;
      void updated_at;
      void created_by;
      setForm(rest as FormState);
    }
  }, [existing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug.trim() || slugify(`${form.title}-${form.company}`),
        location: form.location || [form.city, form.province].filter(Boolean).join(", "),
        closing_date: form.closing_date || null,
      };
      const now = new Date().toISOString();
      if (isNew) {
        const user = await getCurrentUser();
        await fbAddDoc(jobsCol(), {
          ...payload,
          created_at: now,
          updated_at: now,
          created_by: user?.uid ?? null,
        } satisfies JobData);
        toast.success("Vacancy created");
      } else {
        await fbUpdateDoc(fbDoc(jobsCol(), id), {
          ...payload,
          updated_at: now,
        } satisfies Partial<JobData>);
        toast.success("Vacancy saved");
      }
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the vacancy");
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && isLoading) {
    return (
      <AdminShell title="Vacancy editor">
        <LoadingSpinner label="Loading vacancy…" />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={isNew ? "Post a vacancy" : "Edit vacancy"}
      action={
        <Link
          to="/admin"
          className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Back to dashboard
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy">Vacancy details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Job title">
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
            <Field label="Employer / department">
              <input
                required
                className={inputClass}
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </Field>
            <Field label="Company logo URL (https)">
              <input
                className={inputClass}
                placeholder="https://example.co.za/logo.png"
                value={form.company_logo_url}
                onChange={(e) => set("company_logo_url", e.target.value)}
              />
            </Field>
            <Field label="URL slug (optional)">
              <input
                className={inputClass}
                placeholder="auto-generated from the title"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
            </Field>
            <Field label="Reference number">
              <input
                className={inputClass}
                value={form.reference_number}
                onChange={(e) => set("reference_number", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Employment type">
              <select
                className={inputClass}
                value={form.employment_type}
                onChange={(e) => set("employment_type", e.target.value)}
              >
                {EMPLOYMENT_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Province">
              <select
                className={inputClass}
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
              >
                {PROVINCES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="City / town">
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="Experience level">
              <select
                className={inputClass}
                value={form.experience_level}
                onChange={(e) => set("experience_level", e.target.value)}
              >
                {EXPERIENCE_LEVELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Minimum education">
              <select
                className={inputClass}
                value={form.education_requirement}
                onChange={(e) => set("education_requirement", e.target.value)}
              >
                {EDUCATION_LEVELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Salary text (as advertised)">
              <input
                className={inputClass}
                placeholder="R12 000 - R15 000 per month"
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
              />
            </Field>
            <Field label="Closing date">
              <input
                type="date"
                className={inputClass}
                value={form.closing_date ?? ""}
                onChange={(e) => set("closing_date", e.target.value || null)}
              />
            </Field>
            <Field label="Salary minimum (R, for filters)">
              <input
                type="number"
                className={inputClass}
                value={form.salary_min ?? ""}
                onChange={(e) => set("salary_min", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Salary maximum (R, for filters)">
              <input
                type="number"
                className={inputClass}
                value={form.salary_max ?? ""}
                onChange={(e) => set("salary_max", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy">Description</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use a new line per bullet point — the job page renders each line as a list item.
          </p>
          <div className="mt-4 space-y-4">
            {(
              [
                ["description", "Overview"],
                ["responsibilities", "Key responsibilities"],
                ["requirements", "Requirements"],
                ["qualifications", "Qualifications"],
                ["additional_information", "Additional information"],
                ["how_to_apply", "How to apply"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea
                  rows={key === "description" ? 5 : 4}
                  className={inputClass}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy">
            Application &amp; publishing
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Application method">
              <select
                className={inputClass}
                value={form.application_method}
                onChange={(e) => set("application_method", e.target.value)}
              >
                {APPLICATION_METHODS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Application email">
              <input
                type="email"
                className={inputClass}
                value={form.application_email}
                onChange={(e) => set("application_email", e.target.value)}
              />
            </Field>
            <Field label="Application URL">
              <input
                type="url"
                className={inputClass}
                value={form.application_url}
                onChange={(e) => set("application_url", e.target.value)}
              />
            </Field>
            <Field label="Original source URL">
              <input
                type="url"
                className={inputClass}
                value={form.source_url}
                onChange={(e) => set("source_url", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {JOB_STATUSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.urgent}
                  onChange={(e) => set("urgent", e.target.checked)}
                  className="h-4 w-4"
                />
                Urgent
              </label>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-navy px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-soft disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create vacancy" : "Save changes"}
          </button>
          <Link
            to="/admin"
            className="rounded-md border border-input px-5 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AdminShell>
  );
}
