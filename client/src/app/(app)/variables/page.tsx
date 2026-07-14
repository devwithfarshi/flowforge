"use client";

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import type { Variable, VariableScope } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

const SCOPE_TONE: Record<VariableScope, BadgeTone> = {
  global: "primary",
  environment: "info",
  secret: "warning",
};
const SCOPE_LABEL: Record<VariableScope, string> = {
  global: "Global",
  environment: "Environment",
  secret: "Secret",
};

interface FormState {
  id?: string;
  key: string;
  value: string;
  scope: VariableScope;
  environment: "production" | "staging" | "development";
  description: string;
}
const EMPTY: FormState = {
  key: "",
  value: "",
  scope: "global",
  environment: "production",
  description: "",
};

export default function VariablesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: variables, loading } = useAsyncData(
    () => api.variables.list({ scope: tab, search }),
    [tab, search],
    [KEYS.variables],
  );

  const counts = useAsyncData(() => api.variables.list(), [], [KEYS.variables]);
  const tabCounts = useMemo(() => {
    const all = counts.data ?? [];
    return {
      all: all.length,
      global: all.filter((v) => v.scope === "global").length,
      environment: all.filter((v) => v.scope === "environment").length,
      secret: all.filter((v) => v.scope === "secret").length,
    };
  }, [counts.data]);

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openCreate = () => {
    setErrors({});
    setForm({ ...EMPTY });
  };
  const openEdit = (v: Variable) => {
    setErrors({});
    setForm({
      id: v.id,
      key: v.key,
      value: v.value,
      scope: v.scope,
      environment: v.environment ?? "production",
      description: v.description ?? "",
    });
  };

  const submit = async () => {
    if (!form) return;
    const errs: Record<string, string> = {};
    if (!form.key.trim()) errs.key = "Key is required";
    else if (!/^[A-Z0-9_]+$/i.test(form.key))
      errs.key = "Use letters, numbers and underscores only";
    if (!form.value.trim()) errs.value = "Value is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      const payload = {
        key: form.key.trim(),
        value: form.value,
        scope: form.scope,
        environment:
          form.scope === "environment" ? form.environment : undefined,
        description: form.description,
      };
      if (form.id) {
        await api.variables.update(form.id, payload);
        toast.success("Variable updated");
      } else {
        await api.variables.create(payload);
        toast.success("Variable created");
      }
      setForm(null);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (v: Variable) => {
    const ok = await confirm({
      title: `Delete ${v.key}?`,
      description: "This cannot be undone.",
      confirmText: "Delete",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;
    await api.variables.remove(v.id);
    toast.success("Variable deleted");
  };

  const copy = (v: Variable) => {
    navigator.clipboard?.writeText(v.value);
    toast.success("Copied to clipboard");
  };

  return (
    <PageContainer wide>
      <PageHeader
        title="Variables"
        description="Manage global values, environment configuration, and secrets."
        actions={
          <Button leftIcon="plus" onClick={openCreate}>
            Create variable
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All", count: tabCounts.all },
            { value: "global", label: "Global", count: tabCounts.global },
            {
              value: "environment",
              label: "Environment",
              count: tabCounts.environment,
            },
            { value: "secret", label: "Secrets", count: tabCounts.secret },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search variables…"
          className="sm:max-w-xs"
        />
      </div>

      {loading && !variables ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : variables && variables.length > 0 ? (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <TR>
                <TH>Key</TH>
                <TH>Value</TH>
                <TH>Scope</TH>
                <TH>Updated</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {variables.map((v) => {
                const isSecret = v.scope === "secret";
                const show = revealed.has(v.id);
                return (
                  <TR key={v.id} className="hover:bg-accent/40">
                    <TD>
                      <div className="flex items-center gap-2">
                        <Icon
                          name={isSecret ? "lock" : "braces"}
                          size={15}
                          className="text-muted-foreground"
                        />
                        <span className="font-mono text-[13px] font-medium text-foreground">
                          {v.key}
                        </span>
                      </div>
                      {v.description && (
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {v.description}
                        </span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[240px] truncate font-mono text-[13px] text-muted-foreground">
                          {isSecret && !show ? "•".repeat(16) : v.value}
                        </span>
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(v.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={show ? "Hide" : "Reveal"}
                          >
                            <Icon name={show ? "eye-off" : "eye"} size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => copy(v)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copy"
                        >
                          <Icon name="copy" size={14} />
                        </button>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={SCOPE_TONE[v.scope]}>
                        {SCOPE_LABEL[v.scope]}
                        {v.environment ? ` · ${v.environment}` : ""}
                      </Badge>
                    </TD>
                    <TD className="text-[13px] text-muted-foreground">
                      {timeAgo(v.updatedAt)}
                    </TD>
                    <TD>
                      <Dropdown
                        align="end"
                        trigger={
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label="Actions"
                          >
                            <Icon name="more-horizontal" size={16} />
                          </button>
                        }
                      >
                        <DropdownItem
                          icon="pencil"
                          onSelect={() => openEdit(v)}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownItem icon="copy" onSelect={() => copy(v)}>
                          Copy value
                        </DropdownItem>
                        <DropdownItem
                          icon="trash"
                          destructive
                          onSelect={() => remove(v)}
                        >
                          Delete
                        </DropdownItem>
                      </Dropdown>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="braces"
            title="No variables yet"
            description="Create a variable to reuse values across your workflows."
            action={
              <Button leftIcon="plus" onClick={openCreate}>
                Create variable
              </Button>
            }
          />
        </Card>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit variable" : "Create variable"}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={submit}>
              {form?.id ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Key" required error={errors.key}>
              <Input
                value={form.key}
                onChange={(e) =>
                  setForm({ ...form, key: e.target.value.toUpperCase() })
                }
                placeholder="MY_VARIABLE"
                invalid={!!errors.key}
                className="font-mono"
              />
            </Field>
            <Field label="Value" required error={errors.value}>
              <Textarea
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="Value"
                rows={2}
                invalid={!!errors.value}
                className="font-mono text-[13px]"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Scope">
                <Select
                  value={form.scope}
                  onChange={(v) =>
                    setForm({ ...form, scope: v as VariableScope })
                  }
                  options={[
                    { label: "Global", value: "global" },
                    { label: "Environment", value: "environment" },
                    { label: "Secret", value: "secret" },
                  ]}
                />
              </Field>
              {form.scope === "environment" && (
                <Field label="Environment">
                  <Select
                    value={form.environment}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        environment: v as FormState["environment"],
                      })
                    }
                    options={[
                      { label: "Production", value: "production" },
                      { label: "Staging", value: "staging" },
                      { label: "Development", value: "development" },
                    ]}
                  />
                </Field>
              )}
            </div>
            <Field label="Description" helper="Optional">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this used for?"
              />
            </Field>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
