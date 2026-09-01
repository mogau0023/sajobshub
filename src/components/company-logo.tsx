import { useState } from "react";

function initials(company: string) {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function CompanyLogo({
  company,
  src,
  size = "md",
}: {
  company: string;
  src?: string | null;
  size?: "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const box = size === "lg" ? "size-16" : "size-12";
  const text = size === "lg" ? "text-lg" : "text-sm";

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`${box} ${text} flex shrink-0 items-center justify-center rounded-lg border border-border bg-secondary font-display font-bold text-navy`}
      >
        {initials(company) || "SA"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${company} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${box} shrink-0 rounded-lg border border-border bg-card object-contain p-1`}
    />
  );
}
