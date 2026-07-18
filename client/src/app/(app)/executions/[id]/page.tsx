"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { ExecutionStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { TRIGGER_LABEL } from "@/lib/display";
import { getNodeDef } from "@/lib/nodes/catalog";
import type { ExecutionStatus, LogLevel } from "@/lib/types";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const NODE_STATUS_CLS: Record<ExecutionStatus, string> = {
  success: "border-success/40 bg-success/10 text-success",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  running: "border-warning/40 bg-warning/10 text-warning",
  queued: "border-border bg-muted text-muted-foreground",
  canceled: "border-border bg-muted text-muted-foreground",
};

const LEVEL_CLS: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  success: "text-success",
  error: "text-destructive",
  warn: "text-warning",
  debug: "text-muted-foreground/70",
};

export default function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const {
    data: exec,
    loading,
    error,
  } = useAsyncData(() => api.executions.get(id), [id], [KEYS.executions]);

  if (loading) {
    return (
      <PageContainer wide>
        <Skeleton className="h-10 w-72" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-1" />
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        </div>
      </PageContainer>
    );
  }

  if (error || !exec) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon="play"
            title="Execution not found"
            action={
              <Link href="/executions">
                <Button variant="outline">Back to executions</Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const errorCount = exec.logs.filter((l) => l.level === "error").length;

  const rerun = async () => {
    await api.workflows.run(exec.workflowId);
    // Async run: the new execution is queued and streams progress. It appears
    // in the executions list; this page keeps showing the record you opened.
    toast.success("Re-run started", "Track progress in Executions.");
  };

  return (
    <PageContainer wide>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/executions"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon name="arrow-left" size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                {exec.workflowName}
              </h1>
              <ExecutionStatusBadge status={exec.status} />
            </div>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">
              {exec.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/workflows/${exec.workflowId}`}>
            <Button variant="outline" leftIcon="workflow">
              Workflow
            </Button>
          </Link>
          <Button leftIcon="refresh-cw" onClick={rerun}>
            Re-run
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Started", value: formatDateTime(exec.startedAt) },
          {
            label: "Finished",
            value: exec.finishedAt ? formatDateTime(exec.finishedAt) : "—",
          },
          { label: "Duration", value: formatDuration(exec.durationMs) },
          { label: "Trigger", value: TRIGGER_LABEL[exec.trigger] },
          { label: "Triggered by", value: exec.triggeredBy, avatar: true },
        ].map((f) => (
          <div key={f.label}>
            <p className="text-[12px] text-muted-foreground">{f.label}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              {f.avatar && (
                <Avatar name={String(f.value)} size={18} color="#64748b" />
              )}
              {f.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Node timeline</CardTitle>
            <span className="text-[12px] text-muted-foreground">
              {exec.nodeRuns.length} nodes
            </span>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-1">
              {exec.nodeRuns.map((nr, i) => {
                const def = getNodeDef(nr.nodeType);
                return (
                  <div key={nr.nodeId} className="relative flex gap-3 pb-3">
                    {i < exec.nodeRuns.length - 1 && (
                      <span className="absolute left-[15px] top-8 h-full w-px bg-border" />
                    )}
                    <span
                      className={cn(
                        "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        NODE_STATUS_CLS[nr.status],
                      )}
                    >
                      <Icon
                        name={
                          nr.status === "success"
                            ? "check"
                            : nr.status === "failed"
                              ? "x"
                              : (def?.icon ?? "circle")
                        }
                        size={15}
                      />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {nr.nodeName}
                        </p>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                          {formatDuration(nr.durationMs)}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">
                        {def?.label ?? nr.nodeType}
                      </p>
                      {nr.output && nr.status === "success" && (
                        <p className="mt-1 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {nr.output}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Logs</CardTitle>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-destructive">
                <Icon name="alert-circle" size={13} /> {errorCount} error
                {errorCount > 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>
          <div className="scrollbar-thin max-h-[520px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
            {exec.logs.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "flex gap-2.5 border-b border-border/50 py-1",
                  l.level === "error" && "bg-destructive/5",
                )}
              >
                <span className="shrink-0 text-muted-foreground/60">
                  {new Date(l.ts).toLocaleTimeString("en-US", {
                    hour12: false,
                  })}
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 font-semibold uppercase",
                    LEVEL_CLS[l.level],
                  )}
                >
                  {l.level}
                </span>
                {l.nodeName && (
                  <span className="shrink-0 text-primary">[{l.nodeName}]</span>
                )}
                <span className="text-foreground">{l.message}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
