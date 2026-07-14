"use client";

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { IntegrationStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import type { Integration } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

export default function IntegrationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: integrations, loading } = useAsyncData(
    () => api.integrations.list(),
    [],
    [KEYS.integrations],
  );
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const [accountLabel, setAccountLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    let items = integrations ?? [];
    if (tab === "connected")
      items = items.filter(
        (i) => i.status === "connected" || i.status === "error",
      );
    else if (tab === "available")
      items = items.filter((i) => i.status === "available");
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return items;
  }, [integrations, tab, search]);

  const counts = useMemo(
    () => ({
      all: integrations?.length ?? 0,
      connected:
        integrations?.filter((i) => i.status !== "available").length ?? 0,
      available:
        integrations?.filter((i) => i.status === "available").length ?? 0,
    }),
    [integrations],
  );

  const openConnect = (i: Integration) => {
    setConnecting(i);
    setAccountLabel("");
  };

  const submitConnect = async () => {
    if (!connecting || !accountLabel.trim()) return;
    setSubmitting(true);
    try {
      await api.integrations.connect(connecting.id, accountLabel.trim());
      toast.success(`${connecting.name} connected`);
      setConnecting(null);
    } finally {
      setSubmitting(false);
    }
  };

  const disconnect = async (i: Integration) => {
    const ok = await confirm({
      title: `Disconnect ${i.name}?`,
      description: "Workflows using this integration may stop working.",
      confirmText: "Disconnect",
      tone: "danger",
      icon: "plug",
    });
    if (!ok) return;
    await api.integrations.disconnect(i.id);
    toast.success(`${i.name} disconnected`);
  };

  return (
    <PageContainer wide>
      <PageHeader
        title="Integrations"
        description="Connect the apps and services your workflows depend on."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All apps", count: counts.all },
            { value: "connected", label: "Connected", count: counts.connected },
            { value: "available", label: "Available", count: counts.available },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search integrations…"
          className="sm:max-w-xs"
        />
      </div>

      {loading && !integrations ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="plug"
            title="No integrations found"
            description="Try a different filter or search."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: i.color }}
                >
                  <Icon name={i.icon as IconName} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-[14px] font-semibold text-foreground">
                      {i.name}
                    </h3>
                    {i.popular && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {i.category}
                  </p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-muted-foreground">
                {i.description}
              </p>

              {i.accounts.length > 0 && (
                <div className="mt-3 space-y-1">
                  {i.accounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2.5 py-1.5"
                    >
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {a.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(a.connectedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <IntegrationStatusBadge status={i.status} />
                {i.status === "available" ? (
                  <Button
                    size="sm"
                    leftIcon="plus"
                    onClick={() => openConnect(i)}
                  >
                    Connect
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConnect(i)}
                    >
                      Add account
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnect(i)}
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!connecting}
        onClose={() => setConnecting(null)}
        title={`Connect ${connecting?.name ?? ""}`}
        description="Enter a label for this account or workspace."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConnecting(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={submitting}
              disabled={!accountLabel.trim()}
              onClick={submitConnect}
            >
              Connect
            </Button>
          </>
        }
      >
        <Field label="Account label">
          <Input
            value={accountLabel}
            onChange={(e) => setAccountLabel(e.target.value)}
            placeholder="e.g. Acme Workspace"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && submitConnect()}
          />
        </Field>
      </Modal>
    </PageContainer>
  );
}
