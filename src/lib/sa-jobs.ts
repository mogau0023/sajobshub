export type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
  company_logo_url: string;
  category: string;
  province: string;
  city: string;
  location: string;
  employment_type: string;
  experience_level: string;
  education_requirement: string;
  salary: string;
  salary_min: number | null;
  salary_max: number | null;
  reference_number: string;
  posted_at: string;
  closing_date: string | null;
  description: string;
  responsibilities: string;
  requirements: string;
  qualifications: string;
  additional_information: string;
  how_to_apply: string;
  application_method: string;
  application_email: string;
  application_url: string;
  source_url: string;
  featured: boolean;
  urgent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export const SITE_EMAIL = "vacancies@sajobs.co.za";
export const SITE_URL = "https://sajobs.co.za";

export const PROVINCES = [
  "Gauteng",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Western Cape",
  "Northern Cape",
] as const;

export const CATEGORIES = [
  "General Jobs",
  "Government Jobs",
  "Graduate Jobs",
  "Internships",
  "Learnerships",
  "Apprenticeships",
  "Part-Time Jobs",
  "Full-Time Jobs",
  "No Experience Jobs",
  "Remote Jobs",
  "Temporary Jobs",
  "Security Jobs",
  "Retail Jobs",
  "Administration Jobs",
  "Engineering Jobs",
  "IT Jobs",
  "Finance Jobs",
  "Healthcare Jobs",
  "Education Jobs",
  "Hospitality Jobs",
  "Logistics Jobs",
] as const;

export const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract",
  "Temporary",
  "Internship",
  "Learnership",
  "Apprenticeship",
  "Remote",
] as const;

export const EXPERIENCE_LEVELS = [
  "No Experience",
  "Entry Level",
  "Mid Level",
  "Senior Level",
  "Management",
] as const;

export const EDUCATION_LEVELS = [
  "No Formal Qualification",
  "Grade 10 / N2",
  "Matric",
  "Certificate",
  "Diploma",
  "Degree",
  "Postgraduate",
] as const;

export const SALARY_BANDS = [
  { value: "0-8000", label: "Up to R8 000" },
  { value: "8000-15000", label: "R8 000 - R15 000" },
  { value: "15000-25000", label: "R15 000 - R25 000" },
  { value: "25000-40000", label: "R25 000 - R40 000" },
  { value: "40000-1000000", label: "R40 000+" },
] as const;

export const DATE_POSTED_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
] as const;

export const APPLICATION_METHODS = ["email", "url", "post", "in-person"] as const;
export const JOB_STATUSES = ["draft", "published", "archived"] as const;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function fromSlug(slug: string, list: readonly string[]): string | undefined {
  return list.find((item) => slugify(item) === slug);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(value: string): string {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function isExpired(job: Pick<Job, "closing_date">): boolean {
  if (!job.closing_date) return false;
  return new Date(job.closing_date).getTime() < new Date().setHours(0, 0, 0, 0);
}

export function daysLeft(closing: string | null): number | null {
  if (!closing) return null;
  const diff = new Date(closing).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

export function applyDestination(job: Job): string | null {
  if (job.application_url) return job.application_url;
  if (job.application_email) {
    const subject = encodeURIComponent(
      job.reference_number
        ? `Application: ${job.title} (${job.reference_number})`
        : `Application: ${job.title}`,
    );
    return `mailto:${job.application_email}?subject=${subject}`;
  }
  if (job.source_url) return job.source_url;
  return null;
}
