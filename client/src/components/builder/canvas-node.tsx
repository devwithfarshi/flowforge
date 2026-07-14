"use client";

import { Icon } from "@/components/ui/icon";
import { NODE_W, PORT_GAP, PORT_Y0 } from "@/lib/builder/geometry";
import type { NodeDefinition, WorkflowNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_RING: Record<NonNullable<WorkflowNode["status"]>, string> = {
  idle: "",
  running: "ring-2 ring-warning",
  success: "ring-2 ring-success",
  error: "ring-2 ring-destructive",
  warning: "ring-2 ring-warning",
};

const STATUS_DOT: Record<NonNullable<WorkflowNode["status"]>, string> = {
  idle: "bg-border-strong",
  running: "bg-warning animate-pulse",
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-warning",
};

interface CanvasNodeProps {
  node: WorkflowNode;
  def?: NodeDefinition;
  selected: boolean;
  onBodyPointerDown: (e: React.PointerEvent) => void;
  onStartConnection: (e: React.PointerEvent, outputIndex: number) => void;
  onDelete: () => void;
}

export function CanvasNode({
  node,
  def,
  selected,
  onBodyPointerDown,
  onStartConnection,
  onDelete,
}: CanvasNodeProps) {
  const outputs = def?.outputs ?? 1;
  const color = def?.color ?? "#64748b";
  const status = node.status ?? "idle";

  return (
    <div
      className={cn(
        "absolute select-none rounded-xl border bg-card shadow-sm transition-shadow",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:shadow-md",
        status !== "idle" && !selected && STATUS_RING[status],
      )}
      style={{ left: node.position.x, top: node.position.y, width: NODE_W }}
      onPointerDown={onBodyPointerDown}
      data-node-body={node.id}
    >
      {/* Input port */}
      {(def?.inputs ?? 1) > 0 && (
        <span
          className="absolute -left-[7px] z-10 h-3.5 w-3.5 cursor-crosshair rounded-full border-2 border-card bg-border-strong transition-colors hover:bg-primary"
          style={{ top: PORT_Y0 - 7 }}
          data-port-role="in"
          data-node-id={node.id}
        />
      )}

      {/* Output ports */}
      {Array.from({ length: outputs }).map((_, i) => (
        <span
          key={i}
          className="absolute -right-[7px] z-10 h-3.5 w-3.5 cursor-crosshair rounded-full border-2 border-card bg-primary transition-transform hover:scale-125"
          style={{ top: PORT_Y0 - 7 + i * PORT_GAP }}
          data-port-role="out"
          data-node-id={node.id}
          data-port-index={i}
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartConnection(e, i);
          }}
        />
      ))}

      {/* Body */}
      <div className="flex items-start gap-2.5 p-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border"
          style={{ background: `${color}14`, color }}
        >
          <Icon name={def?.icon ?? "circle"} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                STATUS_DOT[status],
              )}
            />
            <p className="truncate text-[13px] font-semibold text-foreground">
              {node.name}
            </p>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
            {node.description || def?.description || def?.label}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete node"
          style={{ opacity: selected ? 1 : undefined }}
        >
          <Icon name="x" size={13} />
        </button>
      </div>

      {outputs > 1 && (
        <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-1">
          {Array.from({ length: outputs }).map((_, i) => (
            <span
              key={i}
              className="text-[9.5px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {def?.type === "logic.if"
                ? i === 0
                  ? "true"
                  : "false"
                : `out ${i + 1}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
