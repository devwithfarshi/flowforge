"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import {
  ExecutionStatusBadge,
  WorkflowStatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { useWorkflowActions } from "@/hooks/use-workflow-actions";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { TRIGGER_ICON, TRIGGER_LABEL, tagColor } from "@/lib/display";
import { getNodeDef } from "@/lib/nodes/catalog";
import {
  cn,
  formatDate,
  formatDuration,
  formatNumber,
  timeAgo,
} from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const actions = useWorkflowActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const {
    data: wf,
    loading,
    error,
  } = useAsyncData(() => api.workflows.get(id), [id], [KEYS.workflows]);
  const { data: execs } = useAsyncData(
    () => api.executions.list({ workflowId: id, pageSize: 8 }),
    [id],
    [KEYS.executions],
  );

  if (loading && !wf) {
    return (
      <PageContainer wide>
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error || !wf) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon="workflow"
            title="Workflow not found"
            description="It may have been deleted."
            action={
              <Link href="/workflows">
                <Button variant="outline">Back to workflows</Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const successRate = wf.executionCount
    ? Math.round((wf.successCount / wf.executionCount) * 100)
    : 100;
  const archived = wf.status === "archived";

  const saveName = async () => {
    setEditing(false);
    if (name.trim() && name !== wf.name) {
      await api.workflows.update(wf.id, { name: name.trim() });
      toast.success("Workflow renamed");
    }
  };

  return (
    <PageContainer wide>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            <Icon name={TRIGGER_ICON[wf.triggerType]} size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="rounded-md border border-input bg-card px-2 py-0.5 text-[20px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setName(wf.name);
                    setEditing(true);
                  }}
                  className="group flex items-center gap-2 text-left"
                >
                  <h1 className="truncate text-[22px] font-semibold tracking-tight text-foreground">
                    {wf.name}
                  </h1>
                  <Icon
                    name="pencil"
                    size={15}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              )}
              <WorkflowStatusBadge status={wf.status} />
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {wf.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            leftIcon={wf.favorite ? "star-filled" : "star"}
            onClick={() => actions.toggleFavorite(wf)}
          >
            {wf.favorite ? "Favorited" : "Favorite"}
          </Button>
          {!archived && (
            <Button
              variant="outline"
              leftIcon="play"
              onClick={() => actions.run(wf.id)}
            >
              Run
            </Button>
          )}
          {!archived && (
            <Link href={`/builder/${wf.id}`}>
              <Button leftIcon="pencil">Open in builder</Button>
            </Link>
          )}
          <Dropdown
            align="end"
            trigger={
              <Button variant="outline" size="icon" aria-label="More actions">
                <Icon name="more-horizontal" size={18} />
              </Button>
            }
          >
            <DropdownItem icon="copy" onSelect={() => actions.duplicate(wf.id)}>
              Duplicate
            </DropdownItem>
            <DropdownItem
              icon="download"
              onSelect={() => actions.exportWorkflows([wf])}
            >
              Export
            </DropdownItem>
            <DropdownSeparator />
            {archived ? (
              <DropdownItem
                icon="archive-restore"
                onSelect={() => actions.restore(wf.id)}
              >
                Restore
              </DropdownItem>
            ) : (
              <DropdownItem
                icon="archive"
                onSelect={async () => {
                  if (await actions.archive(wf)) router.push("/workflows");
                }}
              >
                Archive
              </DropdownItem>
            )}
            <DropdownItem
              icon="trash"
              destructive
              onSelect={async () => {
                if (await actions.remove(wf)) router.push("/workflows");
              }}
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total runs",
            value: formatNumber(wf.executionCount),
            icon: "play" as const,
            tone: "text-primary",
          },
          {
            label: "Success rate",
            value: `${successRate}%`,
            icon: "check-circle" as const,
            tone: "text-success",
          },
          {
            label: "Failures",
            value: formatNumber(wf.failureCount),
            icon: "alert-triangle" as const,
            tone: "text-destructive",
          },
          {
            label: "Nodes",
            value: wf.nodes.length,
            icon: "workflow" as const,
            tone: "text-muted-foreground",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name={s.icon} size={15} className={s.tone} />
              <span className="text-[12.5px] font-medium">{s.label}</span>
            </div>
            <p className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: nodes + executions */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Nodes ({wf.nodes.length})</CardTitle>
              {!archived && (
                <Link
                  href={`/builder/${wf.id}`}
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  Edit
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {wf.nodes.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  {wf.nodes.map((n, i) => {
                    const def = getNodeDef(n.type);
                    return (
                      <div key={n.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{
                              background: `${def?.color ?? "#64748b"}1a`,
                              color: def?.color ?? "#64748b",
                            }}
                          >
                            <Icon name={def?.icon ?? "circle"} size={14} />
                          </span>
                          <span className="text-[13px] font-medium text-foreground">
                            {n.name}
                          </span>
                        </div>
                        {i < wf.nodes.length - 1 && (
                          <Icon
                            name="arrow-right"
                            size={14}
                            className="text-muted-foreground/50"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  This workflow has no nodes yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent executions</CardTitle>
              <Link
                href={`/executions?workflow=${wf.id}`}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <div className="divide-y divide-border">
              {execs?.items.length ? (
                execs.items.map((e) => (
                  <Link
                    key={e.id}
                    href={`/executions/${e.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <ExecutionStatusBadge status={e.status} />
                    <span className="flex-1 text-[13px] text-muted-foreground">
                      {TRIGGER_LABEL[e.trigger]} · {e.triggeredBy}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {formatDuration(e.durationMs)}
                    </span>
                    <span className="w-20 text-right text-[12px] text-muted-foreground">
                      {timeAgo(e.startedAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                  No executions yet
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right: metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-[13px]">
              {[
                {
                  label: "Trigger",
                  value: (
                    <span className="flex items-center gap-1.5">
                      <Icon
                        name={TRIGGER_ICON[wf.triggerType]}
                        size={14}
                        className="text-muted-foreground"
                      />
                      {TRIGGER_LABEL[wf.triggerType]}
                    </span>
                  ),
                },
                {
                  label: "Owner",
                  value: (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={wf.ownerName} size={20} color="#64748b" />
                      {wf.ownerName}
                    </span>
                  ),
                },
                { label: "Created", value: formatDate(wf.createdAt) },
                { label: "Updated", value: timeAgo(wf.updatedAt) },
                {
                  label: "Last run",
                  value: wf.lastRunAt ? timeAgo(wf.lastRunAt) : "Never",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {wf.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {wf.tags.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] font-medium text-foreground",
                      )}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: tagColor(t) }}
                      />
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">No tags</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
