import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

export function LoadingSpinner({
  size = "md",
  label = "Loading…",
  className,
}: LoadingSpinnerProps) {
  const sizeClass =
    size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-8 w-8 border-[3px]" : "h-5 w-5 border-2";

  const textClass = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-5 text-muted-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "inline-block animate-spin rounded-full border-solid border-current border-r-transparent border-t-transparent",
          sizeClass,
          "text-navy",
        )}
      />
      <span className={cn("font-medium", textClass)}>{label}</span>
    </div>
  );
}

type SpinnerOnlyProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function SpinnerOnly({ size = "md", className }: SpinnerOnlyProps) {
  const sizeClass =
    size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-8 w-8 border-[3px]" : "h-5 w-5 border-2";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-current border-r-transparent border-t-transparent text-navy",
        sizeClass,
        className,
      )}
    />
  );
}
