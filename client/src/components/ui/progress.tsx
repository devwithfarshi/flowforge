import { clamp, cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

const TONE: Record<NonNullable<ProgressProps["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function Progress({
  value,
  max = 100,
  className,
  tone = "primary",
}: ProgressProps) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          TONE[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
