import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: "primary" | "success" | "warning" | "danger";
  delta?: { value: string; positive: boolean };
  sparkline?: number[];
  footer?: string;
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  delta,
  sparkline,
  footer,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            TONE[tone],
          )}
        >
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px]">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta.positive ? "text-success" : "text-destructive",
              )}
            >
              <Icon
                name={delta.positive ? "trending-up" : "arrow-down"}
                size={13}
              />
              {delta.value}
            </span>
          )}
          {footer && <span className="text-muted-foreground">{footer}</span>}
        </div>
        {sparkline && (
          <Sparkline
            data={sparkline}
            width={96}
            height={30}
            strokeClassName={
              tone === "danger"
                ? "text-destructive"
                : tone === "success"
                  ? "text-success"
                  : "text-primary"
            }
          />
        )}
      </div>
    </Card>
  );
}
