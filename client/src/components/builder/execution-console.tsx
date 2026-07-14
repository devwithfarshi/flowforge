"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";
import type { LogEntry, LogLevel } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  success: "text-success",
  error: "text-destructive",
  warn: "text-warning",
  debug: "text-muted-foreground/70",
};

interface ExecutionConsoleProps {
  logs: LogEntry[];
  running: boolean;
  status: "idle" | "running" | "success" | "failed";
  durationMs?: number | null;
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function ExecutionConsole({
  logs,
  running,
  status,
  durationMs,
  open,
  onToggle,
  onClear,
}: ExecutionConsoleProps) {
  const [filter, setFilter] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => ({
      all: logs.length,
      error: logs.filter((l) => l.level === "error").length,
      warn: logs.filter((l) => l.level === "warn").length,
      success: logs.filter((l) => l.level === "success").length,
    }),
    [logs],
  );

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.level === filter);

  useEffect(() => {
    if (open && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, open]);

  const statusMeta =
    status === "running"
      ? { label: "Running", cls: "text-warning", icon: "loader" as const }
      : status === "success"
        ? {
            label: "Success",
            cls: "text-success",
            icon: "check-circle" as const,
          }
        : status === "failed"
          ? {
              label: "Failed",
              cls: "text-destructive",
              icon: "x-circle" as const,
            }
          : {
              label: "Idle",
              cls: "text-muted-foreground",
              icon: "terminal" as const,
            };

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-t border-border bg-card",
        open ? "h-[220px]" : "h-10",
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-3 px-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Icon name="terminal" size={15} className="text-muted-foreground" />
          Console
          <Icon
            name={open ? "chevron-down" : "chevron-up"}
            size={14}
            className="text-muted-foreground"
          />
        </button>
        <div
          className={cn(
            "flex items-center gap-1.5 text-[12px] font-medium",
            statusMeta.cls,
          )}
        >
          <Icon
            name={statusMeta.icon}
            size={13}
            className={running ? "animate-spin" : ""}
          />
          {statusMeta.label}
          {durationMs != null && status !== "idle" && status !== "running" && (
            <span className="text-muted-foreground">
              · {formatDuration(durationMs)}
            </span>
          )}
        </div>
        {open && (
          <div className="ml-2 hidden md:block">
            <Tabs
              variant="pill"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: "all", label: "All", count: counts.all },
                { value: "error", label: "Errors", count: counts.error },
                { value: "warn", label: "Warnings", count: counts.warn },
                { value: "success", label: "Success", count: counts.success },
              ]}
            />
          </div>
        )}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon name="trash" size={13} /> Clear
        </button>
      </div>

      {open && (
        <div
          ref={scrollRef}
          className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3 font-mono text-[12px] leading-relaxed"
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center font-sans text-[13px] text-muted-foreground">
              {logs.length === 0
                ? "No logs yet. Run the workflow to see execution output."
                : "No matching log entries."}
            </p>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                className="flex gap-2.5 border-b border-border/50 py-1"
              >
                <span className="shrink-0 text-muted-foreground/60">
                  {new Date(l.ts).toLocaleTimeString("en-US", {
                    hour12: false,
                  })}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold uppercase",
                    LEVEL_STYLE[l.level],
                  )}
                >
                  {l.level}
                </span>
                {l.nodeName && (
                  <span className="shrink-0 text-primary">[{l.nodeName}]</span>
                )}
                <span className="text-foreground">{l.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
