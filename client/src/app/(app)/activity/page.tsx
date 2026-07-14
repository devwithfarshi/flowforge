"use client";

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks/use-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import type { ActivityCategory, ActivityEntry } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";

const CAT_ICON: Record<ActivityCategory, IconName> = {
  workflow: "workflow",
  auth: "log-in",
  integration: "plug",
  variable: "braces",
  system: "settings",
  user: "users",
};
const CAT_TONE: Record<ActivityCategory, string> = {
  workflow: "bg-primary/10 text-primary",
  auth: "bg-info/10 text-info",
  integration: "bg-success/10 text-success",
  variable: "bg-warning/10 text-warning",
  system: "bg-muted text-muted-foreground",
  user: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return formatDate(iso, { weekday: "long", month: "long", day: "numeric" });
}

export default function ActivityPage() {
  const [rawSearch, setRawSearch] = useState("");
  const search = useDebouncedValue(rawSearch, 250);
  const [category, setCategory] = useState("all");

  const { data, loading } = useAsyncData(
    () => api.activity.list({ search, category }),
    [search, category],
    [KEYS.activity],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    (data ?? []).forEach((a) => {
      const key = dayLabel(a.ts);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return [...map.entries()];
  }, [data]);

  return (
    <PageContainer>
      <PageHeader
        title="Activity"
        description="A complete audit trail of everything happening in your workspace."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={category}
          onChange={setCategory}
          tabs={[
            { value: "all", label: "All" },
            { value: "workflow", label: "Workflows" },
            { value: "integration", label: "Integrations" },
            { value: "auth", label: "Auth" },
            { value: "system", label: "System" },
          ]}
        />
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search activity…"
          className="sm:max-w-xs"
        />
      </div>

      {loading && !data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon="activity"
            title="No activity found"
            description="Actions across your workspace will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </h3>
              <Card>
                <div className="divide-y divide-border">
                  {entries.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${CAT_TONE[a.category]}`}
                      >
                        <Icon name={CAT_ICON[a.category]} size={15} />
                      </span>
                      <Avatar name={a.actor} size={22} color="#64748b" />
                      <p className="min-w-0 flex-1 text-[13.5px] text-foreground">
                        <span className="font-medium">{a.actor}</span>{" "}
                        {a.action}{" "}
                        <span className="font-medium">{a.target}</span>
                      </p>
                      <span className="shrink-0 text-[12px] text-muted-foreground">
                        {timeAgo(a.ts)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
