import { Icon } from "@/components/ui/icon";
import type {
  ExecutionStatus,
  IntegrationStatus,
  WorkflowStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  purple: "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---- Status badges keyed to domain enums ---- */
const WORKFLOW_TONE: Record<
  WorkflowStatus,
  { tone: BadgeTone; label: string }
> = {
  active: { tone: "success", label: "Active" },
  inactive: { tone: "neutral", label: "Inactive" },
  draft: { tone: "warning", label: "Draft" },
  error: { tone: "danger", label: "Error" },
  archived: { tone: "neutral", label: "Archived" },
};

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const s = WORKFLOW_TONE[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const EXEC_TONE: Record<
  ExecutionStatus,
  { tone: BadgeTone; label: string; icon: Parameters<typeof Icon>[0]["name"] }
> = {
  success: { tone: "success", label: "Success", icon: "check-circle" },
  failed: { tone: "danger", label: "Failed", icon: "x-circle" },
  running: { tone: "info", label: "Running", icon: "loader" },
  queued: { tone: "neutral", label: "Queued", icon: "clock" },
  canceled: { tone: "neutral", label: "Canceled", icon: "circle" },
};

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const s = EXEC_TONE[status];
  return (
    <Badge tone={s.tone}>
      <Icon
        name={s.icon}
        size={12}
        className={status === "running" ? "animate-spin" : ""}
      />
      {s.label}
    </Badge>
  );
}

const INTEGRATION_TONE: Record<
  IntegrationStatus,
  { tone: BadgeTone; label: string }
> = {
  connected: { tone: "success", label: "Connected" },
  available: { tone: "neutral", label: "Available" },
  error: { tone: "danger", label: "Error" },
};

export function IntegrationStatusBadge({
  status,
}: {
  status: IntegrationStatus;
}) {
  const s = INTEGRATION_TONE[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
