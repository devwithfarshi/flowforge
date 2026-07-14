"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { WorkflowStatusBadge } from "@/components/ui/badge";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icon";
import { Checkbox } from "@/components/ui/switch";
import { useWorkflowActions } from "@/hooks/use-workflow-actions";
import { TRIGGER_ICON, TRIGGER_LABEL, tagColor } from "@/lib/display";
import type { Workflow } from "@/lib/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

interface WorkflowCardProps {
  workflow: Workflow;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}

export function WorkflowCard({
  workflow: w,
  selected,
  onSelect,
}: WorkflowCardProps) {
  const actions = useWorkflowActions();
  const archived = w.status === "archived";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-border-strong",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "absolute left-3 top-3 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Checkbox
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${w.name}`}
          />
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-opacity",
            (selected || false) && "opacity-0",
            "group-hover:opacity-0",
          )}
        >
          <Icon name={TRIGGER_ICON[w.triggerType]} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/workflows/${w.id}`} className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-foreground hover:text-primary">
                {w.name}
              </h3>
            </Link>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => actions.toggleFavorite(w)}
                className={cn(
                  "rounded-md p-1 transition-colors hover:bg-accent",
                  w.favorite
                    ? "text-warning"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100",
                )}
                aria-label={w.favorite ? "Unfavorite" : "Favorite"}
              >
                <Icon name={w.favorite ? "star-filled" : "star"} size={15} />
              </button>
              <Dropdown
                align="end"
                trigger={
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Workflow actions"
                  >
                    <Icon name="more-horizontal" size={16} />
                  </button>
                }
              >
                {!archived && (
                  <DropdownItem
                    icon="pencil"
                    onSelect={() => actions.openBuilder(w.id)}
                  >
                    Open in builder
                  </DropdownItem>
                )}
                {!archived && (
                  <DropdownItem icon="play" onSelect={() => actions.run(w.id)}>
                    Run now
                  </DropdownItem>
                )}
                <DropdownItem
                  icon="copy"
                  onSelect={() => actions.duplicate(w.id)}
                >
                  Duplicate
                </DropdownItem>
                <DropdownItem
                  icon="download"
                  onSelect={() => actions.exportWorkflows([w])}
                >
                  Export
                </DropdownItem>
                <DropdownSeparator />
                {archived ? (
                  <DropdownItem
                    icon="archive-restore"
                    onSelect={() => actions.restore(w.id)}
                  >
                    Restore
                  </DropdownItem>
                ) : (
                  <DropdownItem
                    icon="archive"
                    onSelect={() => actions.archive(w)}
                  >
                    Archive
                  </DropdownItem>
                )}
                <DropdownItem
                  icon="trash"
                  destructive
                  onSelect={() => actions.remove(w)}
                >
                  Delete
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
            <Icon name={TRIGGER_ICON[w.triggerType]} size={12} />{" "}
            {TRIGGER_LABEL[w.triggerType]}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-muted-foreground">
        {w.description || "No description"}
      </p>

      {w.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {w.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: tagColor(t) }}
              />
              {t}
            </span>
          ))}
          {w.tags.length > 3 && (
            <span className="text-[11px] text-muted-foreground">
              +{w.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Avatar name={w.ownerName} size={20} color="#64748b" />
          <span className="text-[12px] text-muted-foreground">
            {formatNumber(w.executionCount)} runs
          </span>
          <span className="text-[12px] text-muted-foreground">
            · {w.lastRunAt ? timeAgo(w.lastRunAt) : "never"}
          </span>
        </div>
        <WorkflowStatusBadge status={w.status} />
      </div>
    </div>
  );
}
