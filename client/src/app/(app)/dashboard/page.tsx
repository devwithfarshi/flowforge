"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageContainer } from "@/components/layout/page";
import {
  ExecutionStatusBadge,
  WorkflowStatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { greeting, TRIGGER_ICON } from "@/lib/display";
import { formatDuration, formatNumber, timeAgo } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

const ACTIVITY_ICON: Record<string, IconName> = {
  workflow: "workflow",
  auth: "log-in",
  integration: "plug",
  variable: "braces",
  system: "settings",
  user: "users",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const { data: stats } = useAsyncData(
    () => api.stats.dashboard(),
    [],
    [KEYS.workflows, KEYS.executions, KEYS.notifications],
  );
  const { data: recentWf } = useAsyncData(
    () => api.workflows.list({ sort: "updatedAt:desc", pageSize: 5 }),
    [],
    [KEYS.workflows],
  );
  const { data: recentExec } = useAsyncData(
    () => api.executions.recent(6),
    [],
    [KEYS.executions],
  );
  const { data: favorites } = useAsyncData(
    () => api.workflows.list({ pageSize: 100 }),
    [],
    [KEYS.workflows],
  );
  const { data: activity } = useAsyncData(
    () => api.activity.recent(6),
    [],
    [KEYS.activity],
  );

  const favWorkflows =
    favorites?.items.filter((w) => w.favorite).slice(0, 4) ?? [];

  const newWorkflow = async () => {
    const wf = await api.workflows.create();
    toast.success("Workflow created");
    router.push(`/builder/${wf.id}`);
  };

  return (
    <PageContainer wide>
      {/* Welcome */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            {greeting()}, {user?.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your workspace today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/templates">
            <Button variant="outline" leftIcon="layout-template">
              Browse templates
            </Button>
          </Link>
          <Button leftIcon="plus" onClick={newWorkflow}>
            New workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard
              label="Total workflows"
              value={stats.totalWorkflows}
              icon="workflow"
              tone="primary"
              footer={`${stats.activeWorkflows} active`}
            />
            <StatCard
              label="Executions"
              value={formatNumber(stats.totalExecutions)}
              icon="play"
              tone="primary"
              sparkline={stats.trend}
              delta={{ value: "12.4%", positive: true }}
            />
            <StatCard
              label="Success rate"
              value={`${stats.successRate}%`}
              icon="check-circle"
              tone="success"
              footer="last 30 days"
            />
            <StatCard
              label="Failed runs"
              value={stats.failedExecutions}
              icon="alert-triangle"
              tone="danger"
              footer={`${stats.connectedIntegrations} integrations`}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-xl" />
          ))
        )}
      </div>

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent workflows */}
          <Card>
            <CardHeader>
              <CardTitle>Recent workflows</CardTitle>
              <Link
                href="/workflows"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <div className="divide-y divide-border">
              {recentWf?.items.length ? (
                recentWf.items.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workflows/${w.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <Icon name={TRIGGER_ICON[w.triggerType]} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">
                        {w.name}
                      </p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {w.nodes.length} nodes ·{" "}
                        {formatNumber(w.executionCount)} runs · updated{" "}
                        {timeAgo(w.updatedAt)}
                      </p>
                    </div>
                    <WorkflowStatusBadge status={w.status} />
                  </Link>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No workflows yet
                </div>
              )}
            </div>
          </Card>

          {/* Recent executions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent executions</CardTitle>
              <Link
                href="/executions"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <div className="divide-y divide-border">
              {recentExec?.length ? (
                recentExec.map((e) => (
                  <Link
                    key={e.id}
                    href={`/executions/${e.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <ExecutionStatusBadge status={e.status} />
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                      {e.workflowName}
                    </p>
                    <span className="hidden text-[12px] text-muted-foreground sm:block">
                      {formatDuration(e.durationMs)}
                    </span>
                    <span className="w-20 text-right text-[12px] text-muted-foreground">
                      {timeAgo(e.startedAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No executions yet
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {[
                {
                  icon: "plus" as IconName,
                  label: "New workflow",
                  onClick: newWorkflow,
                },
                {
                  icon: "layout-template" as IconName,
                  label: "Templates",
                  href: "/templates",
                },
                {
                  icon: "plug" as IconName,
                  label: "Integrations",
                  href: "/integrations",
                },
                {
                  icon: "braces" as IconName,
                  label: "Variables",
                  href: "/variables",
                },
              ].map((a) =>
                a.href ? (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 transition-colors hover:border-border-strong hover:bg-accent/50"
                  >
                    <Icon name={a.icon} size={18} className="text-primary" />
                    <span className="text-[13px] font-medium text-foreground">
                      {a.label}
                    </span>
                  </Link>
                ) : (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-border-strong hover:bg-accent/50"
                  >
                    <Icon name={a.icon} size={18} className="text-primary" />
                    <span className="text-[13px] font-medium text-foreground">
                      {a.label}
                    </span>
                  </button>
                ),
              )}
            </CardContent>
          </Card>

          {/* Favorites */}
          <Card>
            <CardHeader>
              <CardTitle>Favorites</CardTitle>
              <Icon name="star-filled" size={15} className="text-warning" />
            </CardHeader>
            <div className="divide-y divide-border">
              {favWorkflows.length ? (
                favWorkflows.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workflows/${w.id}`}
                    className="flex items-center gap-2.5 px-5 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <Icon
                      name={TRIGGER_ICON[w.triggerType]}
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                      {w.name}
                    </span>
                    <Icon
                      name="chevron-right"
                      size={14}
                      className="text-muted-foreground"
                    />
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-center text-[13px] text-muted-foreground">
                  No favorites yet
                </div>
              )}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <Link
                href="/activity"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {activity?.length ? (
                activity.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon
                        name={ACTIVITY_ICON[a.category] ?? "activity"}
                        size={13}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-foreground">
                        <span className="font-medium">{a.actor}</span>{" "}
                        {a.action}{" "}
                        <span className="font-medium">{a.target}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {timeAgo(a.ts)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-[13px] text-muted-foreground">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
