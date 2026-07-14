"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { WorkflowStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput, Segmented } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { useAsyncData } from "@/hooks/use-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useWorkflowActions } from "@/hooks/use-workflow-actions";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { TRIGGER_ICON, TRIGGER_LABEL } from "@/lib/display";
import type { ViewMode } from "@/lib/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

const STATUS_OPTS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Draft", value: "draft" },
  { label: "Error", value: "error" },
  { label: "Archived", value: "archived" },
];
const TRIGGER_OPTS = [
  { label: "All triggers", value: "all" },
  { label: "Webhook", value: "webhook" },
  { label: "Schedule", value: "cron" },
  { label: "Manual", value: "manual" },
  { label: "Email", value: "email" },
  { label: "API", value: "api" },
];
const SORT_OPTS = [
  { label: "Recently updated", value: "updatedAt:desc" },
  { label: "Name (A–Z)", value: "name:asc" },
  { label: "Most runs", value: "executionCount:desc" },
  { label: "Recently run", value: "lastRunAt:desc" },
  { label: "Newest", value: "createdAt:desc" },
];

export default function WorkflowsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const actions = useWorkflowActions();

  const [view, setView] = useState<ViewMode>("grid");
  const [rawSearch, setRawSearch] = useState("");
  const search = useDebouncedValue(rawSearch, 250);
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [sort, setSort] = useState("updatedAt:desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.settings.getPreferences().then((p) => setView(p.defaultView));
  }, []);

  // reset to page 1 whenever filters change
  useEffect(() => setPage(1), [search, status, trigger, sort]);

  const { data, loading } = useAsyncData(
    () =>
      api.workflows.list({
        search,
        status,
        trigger,
        sort,
        page,
        pageSize: view === "grid" ? 9 : 12,
        includeArchived: status === "archived",
      }),
    [search, status, trigger, sort, page, view],
    [KEYS.workflows],
  );

  const items = data?.items ?? [];
  const pageIds = useMemo(() => items.map((w) => w.id), [items]);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const setViewMode = (v: ViewMode) => {
    setView(v);
    api.settings.updatePreferences({ defaultView: v });
  };

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const bulkArchive = async () => {
    await api.workflows.setArchived([...selected], true);
    toast.success(`Archived ${selected.size} workflows`);
    clearSelection();
  };
  const bulkDelete = async () => {
    const ok = await confirm({
      title: `Delete ${selected.size} workflows?`,
      description: "This cannot be undone.",
      confirmText: "Delete",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;
    await api.workflows.remove([...selected]);
    toast.success(`Deleted ${selected.size} workflows`);
    clearSelection();
  };
  const bulkExport = () => {
    actions.exportWorkflows(items.filter((w) => selected.has(w.id)));
    clearSelection();
  };

  const createWorkflow = async () => {
    setCreating(true);
    try {
      const wf = await api.workflows.create();
      router.push(`/builder/${wf.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageContainer wide>
      <PageHeader
        title="Workflows"
        description="Build, organize, and monitor your automations."
        actions={
          <>
            <Link href="/templates">
              <Button variant="outline" leftIcon="layout-template">
                Templates
              </Button>
            </Link>
            <Button leftIcon="plus" loading={creating} onClick={createWorkflow}>
              New workflow
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search workflows…"
          className="lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
            className="w-[140px]"
          />
          <Select
            value={trigger}
            onChange={setTrigger}
            options={TRIGGER_OPTS}
            className="w-[140px]"
          />
          <Select
            value={sort}
            onChange={setSort}
            options={SORT_OPTS}
            className="w-[160px]"
          />
        </div>
        <div className="lg:ml-auto">
          <Segmented
            value={view}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { value: "grid", icon: "grid", label: "Grid" },
              { value: "list", icon: "list", label: "List" },
            ]}
          />
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon="download"
              onClick={bulkExport}
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon="archive"
              onClick={bulkArchive}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon="trash"
              onClick={bulkDelete}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && !data ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="workflow"
            title={
              search || status !== "all" || trigger !== "all"
                ? "No workflows match your filters"
                : "No workflows yet"
            }
            description={
              search || status !== "all" || trigger !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first workflow to start automating."
            }
            action={
              <Button leftIcon="plus" onClick={createWorkflow}>
                New workflow
              </Button>
            }
          />
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              selected={selected.has(w.id)}
              onSelect={(c) => toggle(w.id, c)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={
                      !allSelected && pageIds.some((id) => selected.has(id))
                    }
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </TH>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Trigger</TH>
                <TH className="text-right">Runs</TH>
                <TH>Last run</TH>
                <TH>Owner</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {items.map((w) => (
                <TR
                  key={w.id}
                  className={cn(
                    "hover:bg-accent/40",
                    selected.has(w.id) && "bg-primary/5",
                  )}
                >
                  <TD>
                    <Checkbox
                      checked={selected.has(w.id)}
                      onChange={(c) => toggle(w.id, c)}
                      aria-label={`Select ${w.name}`}
                    />
                  </TD>
                  <TD>
                    <Link
                      href={`/workflows/${w.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Icon name={TRIGGER_ICON[w.triggerType]} size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          {w.favorite && (
                            <Icon
                              name="star-filled"
                              size={12}
                              className="text-warning"
                            />
                          )}
                          <span className="truncate font-medium text-foreground hover:text-primary">
                            {w.name}
                          </span>
                        </span>
                        <span className="line-clamp-1 text-[12px] text-muted-foreground">
                          {w.description || "—"}
                        </span>
                      </span>
                    </Link>
                  </TD>
                  <TD>
                    <WorkflowStatusBadge status={w.status} />
                  </TD>
                  <TD className="text-[13px] text-muted-foreground">
                    {TRIGGER_LABEL[w.triggerType]}
                  </TD>
                  <TD className="text-right text-[13px] tabular-nums text-foreground">
                    {formatNumber(w.executionCount)}
                  </TD>
                  <TD className="text-[13px] text-muted-foreground">
                    {w.lastRunAt ? timeAgo(w.lastRunAt) : "Never"}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Avatar name={w.ownerName} size={22} color="#64748b" />
                      <span className="text-[13px] text-muted-foreground">
                        {w.ownerName.split(" ")[0]}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <Dropdown
                      align="end"
                      trigger={
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Actions"
                        >
                          <Icon name="more-horizontal" size={16} />
                        </button>
                      }
                    >
                      <DropdownItem
                        icon="pencil"
                        onSelect={() => actions.openBuilder(w.id)}
                      >
                        Open in builder
                      </DropdownItem>
                      <DropdownItem
                        icon="play"
                        onSelect={() => actions.run(w.id)}
                      >
                        Run now
                      </DropdownItem>
                      <DropdownItem
                        icon={w.favorite ? "star" : "star-filled"}
                        onSelect={() => actions.toggleFavorite(w)}
                      >
                        {w.favorite ? "Unfavorite" : "Favorite"}
                      </DropdownItem>
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
                      {w.status === "archived" ? (
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
