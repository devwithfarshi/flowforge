"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { ExecutionStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAsyncData } from "@/hooks/use-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { TRIGGER_LABEL } from "@/lib/display";
import { formatDateTime, formatDuration, timeAgo } from "@/lib/utils";

const STATUS_OPTS = [
  { label: "All statuses", value: "all" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Running", value: "running" },
  { label: "Queued", value: "queued" },
  { label: "Canceled", value: "canceled" },
];
const TRIGGER_OPTS = [
  { label: "All triggers", value: "all" },
  { label: "Webhook", value: "webhook" },
  { label: "Schedule", value: "cron" },
  { label: "Manual", value: "manual" },
  { label: "Email", value: "email" },
  { label: "API", value: "api" },
];

function ExecutionsInner() {
  const params = useSearchParams();
  const workflowId = params.get("workflow") ?? undefined;

  const [rawSearch, setRawSearch] = useState("");
  const search = useDebouncedValue(rawSearch, 250);
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [sort, setSort] = useState("startedAt:desc");
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search, status, trigger, sort]);

  const { data, loading } = useAsyncData(
    () =>
      api.executions.list({
        search,
        status,
        trigger,
        sort,
        page,
        pageSize: 15,
        workflowId,
      }),
    [search, status, trigger, sort, page, workflowId],
    [KEYS.executions],
  );

  const items = data?.items ?? [];
  const setSortField = (field: string) =>
    setSort((s) =>
      s.startsWith(field)
        ? `${field}:${s.endsWith("asc") ? "desc" : "asc"}`
        : `${field}:desc`,
    );
  const sortDir = (field: string) =>
    sort.startsWith(field) ? (sort.endsWith("asc") ? "asc" : "desc") : null;

  return (
    <PageContainer wide>
      <PageHeader
        title="Executions"
        description="Every run across your workflows, with full logs and timings."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search executions…"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
            className="w-[150px]"
          />
          <Select
            value={trigger}
            onChange={setTrigger}
            options={TRIGGER_OPTS}
            className="w-[150px]"
          />
        </div>
      </div>

      {loading && !data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="play"
            title="No executions found"
            description="Runs will appear here as your workflows execute."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH
                  sortable
                  sortDir={sortDir("workflowName")}
                  onSort={() => setSortField("workflowName")}
                >
                  Workflow
                </TH>
                <TH>Status</TH>
                <TH
                  sortable
                  sortDir={sortDir("startedAt")}
                  onSort={() => setSortField("startedAt")}
                >
                  Started
                </TH>
                <TH>Finished</TH>
                <TH
                  sortable
                  sortDir={sortDir("durationMs")}
                  onSort={() => setSortField("durationMs")}
                  className="text-right"
                >
                  Duration
                </TH>
                <TH>Trigger</TH>
                <TH>User</TH>
                <TH className="w-8" />
              </TR>
            </THead>
            <TBody>
              {items.map((e) => (
                <TR key={e.id} className="cursor-pointer hover:bg-accent/40">
                  <TD>
                    <Link
                      href={`/executions/${e.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {e.workflowName}
                    </Link>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {e.id.slice(0, 14)}
                    </span>
                  </TD>
                  <TD>
                    <ExecutionStatusBadge status={e.status} />
                  </TD>
                  <TD
                    className="text-[13px] text-muted-foreground"
                    title={formatDateTime(e.startedAt)}
                  >
                    {timeAgo(e.startedAt)}
                  </TD>
                  <TD className="text-[13px] text-muted-foreground">
                    {e.finishedAt ? timeAgo(e.finishedAt) : "—"}
                  </TD>
                  <TD className="text-right text-[13px] tabular-nums text-foreground">
                    {formatDuration(e.durationMs)}
                  </TD>
                  <TD className="text-[13px] text-muted-foreground">
                    {TRIGGER_LABEL[e.trigger]}
                  </TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={e.triggeredBy} size={20} color="#64748b" />
                      <span className="text-[13px] text-muted-foreground">
                        {e.triggeredBy.split(" ")[0]}
                      </span>
                    </span>
                  </TD>
                  <TD>
                    <Link
                      href={`/executions/${e.id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="chevron-right" size={16} />
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-5">
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </PageContainer>
  );
}

export default function ExecutionsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer wide>
          <Skeleton className="h-96 rounded-xl" />
        </PageContainer>
      }
    >
      <ExecutionsInner />
    </Suspense>
  );
}
