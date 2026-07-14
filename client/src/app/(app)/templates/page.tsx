"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import type { Difficulty, Template } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const DIFF_TONE: Record<Difficulty, BadgeTone> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "purple",
};

function TemplateCard({
  t,
  onInstall,
  installing,
}: {
  t: Template;
  onInstall: () => void;
  installing: boolean;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${t.color}18`, color: t.color }}
        >
          <Icon name={t.icon as IconName} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-foreground">
            {t.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge tone={DIFF_TONE[t.difficulty]}>{t.difficulty}</Badge>
            <span className="text-[12px] text-muted-foreground">
              {t.category}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-muted-foreground">
        {t.description}
      </p>
      <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon name="download" size={13} /> {formatNumber(t.installs)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="star-filled" size={13} className="text-warning" />{" "}
          {t.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="workflow" size={13} /> {t.nodeCount} nodes
        </span>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <Button
          size="sm"
          className="w-full"
          leftIcon="plus"
          loading={installing}
          onClick={onInstall}
        >
          Use template
        </Button>
      </div>
    </Card>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const toast = useToast();
  const [rawSearch, setRawSearch] = useState("");
  const search = useDebouncedValue(rawSearch, 200);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("installs");
  const [installing, setInstalling] = useState<string | null>(null);

  const { data: all } = useAsyncData(() => api.templates.list(), []);
  const { data: templates, loading } = useAsyncData(
    () => api.templates.list({ search, category, sort }),
    [search, category, sort],
  );

  const categories = useMemo(() => {
    const set = new Set((all ?? []).map((t) => t.category));
    return [
      { label: "All categories", value: "all" },
      ...[...set].map((c) => ({ label: c, value: c })),
    ];
  }, [all]);

  const featured = (all ?? []).filter((t) => t.featured).slice(0, 3);
  const recentlyUsed = (all ?? []).filter((t) => t.recentlyUsed).slice(0, 4);

  const install = async (t: Template) => {
    setInstalling(t.id);
    try {
      const wf = await api.templates.install(t.id);
      toast.success("Template installed", `Created "${wf.name}"`);
      router.push(`/builder/${wf.id}`);
    } finally {
      setInstalling(null);
    }
  };

  return (
    <PageContainer wide>
      <PageHeader
        title="Templates"
        description="Start faster with pre-built, production-ready workflows."
      />

      {/* Featured */}
      {featured.length > 0 && !search && category === "all" && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="sparkles" size={16} className="text-primary" />
            <h2 className="text-[15px] font-semibold text-foreground">
              Featured
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((t) => (
              <Card key={t.id} className="relative overflow-hidden p-5">
                <div
                  className="absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10"
                  style={{ background: t.color }}
                />
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `${t.color}1a`, color: t.color }}
                >
                  <Icon name={t.icon as IconName} size={24} />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold text-foreground">
                  {t.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                  {t.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Icon
                      name="star-filled"
                      size={13}
                      className="text-warning"
                    />{" "}
                    {t.rating.toFixed(1)} · {formatNumber(t.installs)} installs
                  </span>
                  <Button
                    size="sm"
                    loading={installing === t.id}
                    onClick={() => install(t)}
                  >
                    Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recently used */}
      {recentlyUsed.length > 0 && !search && category === "all" && (
        <div className="mb-8">
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">
            Recently used
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentlyUsed.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => install(t)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-accent/50"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ background: `${t.color}18`, color: t.color }}
                >
                  <Icon name={t.icon as IconName} size={15} />
                </span>
                <span className="text-[13px] font-medium text-foreground">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search templates…"
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select
            value={category}
            onChange={setCategory}
            options={categories}
            className="w-[170px]"
          />
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { label: "Most popular", value: "installs" },
              { label: "Top rated", value: "rating" },
            ]}
            className="w-[150px]"
          />
        </div>
      </div>

      {loading && !templates ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              installing={installing === t.id}
              onInstall={() => install(t)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="layout-template"
            title="No templates found"
            description="Try a different search or category."
          />
        </Card>
      )}
    </PageContainer>
  );
}
