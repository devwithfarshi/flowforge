"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TRIGGER_LABEL, tagColor } from "@/lib/display";
import type {
  ConfigField,
  NodeDefinition,
  TriggerType,
  WorkflowNode,
  WorkflowStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface WorkflowMeta {
  name: string;
  description: string;
  tags: string[];
  triggerType: TriggerType;
  status: WorkflowStatus;
}

interface PropertiesPanelProps {
  node: WorkflowNode | null;
  selectionCount: number;
  def?: NodeDefinition;
  onUpdateNode: (patch: Partial<WorkflowNode>) => void;
  onUpdateConfig: (key: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  meta: WorkflowMeta;
  onMeta: (patch: Partial<WorkflowMeta>) => void;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <span className="text-[13px] text-foreground">{field.label}</span>
        <Switch checked={!!value} onChange={onChange} />
      </div>
    );
  }
  if (
    field.type === "textarea" ||
    field.type === "code" ||
    field.type === "json"
  ) {
    return (
      <Textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.type === "textarea" ? 3 : 4}
        className={cn(field.type !== "textarea" && "font-mono text-[12px]")}
      />
    );
  }
  if (field.type === "select") {
    return (
      <Select
        value={(value as string) ?? ""}
        onChange={onChange}
        options={field.options ?? []}
        placeholder="Select…"
      />
    );
  }
  return (
    <Input
      type={
        field.type === "password"
          ? "password"
          : field.type === "number"
            ? "number"
            : "text"
      }
      value={(value as string | number) ?? ""}
      onChange={(e) =>
        onChange(
          field.type === "number" ? Number(e.target.value) : e.target.value,
        )
      }
      placeholder={field.placeholder}
    />
  );
}

function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[12px] font-medium text-foreground"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: tagColor(t) }}
            />
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Icon name="x" size={11} />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="Add tag and press Enter"
        className="mt-2"
        inputSize="sm"
      />
    </div>
  );
}

export function PropertiesPanel({
  node,
  selectionCount,
  def,
  onUpdateNode,
  onUpdateConfig,
  onDelete,
  onDuplicate,
  meta,
  onMeta,
}: PropertiesPanelProps) {
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  useEffect(() => setErrors({}), [node?.id]);

  const validate = () => {
    if (!def || !node) return;
    const next: Record<string, boolean> = {};
    for (const f of def.fields)
      if (f.required && !String(node.config[f.key] ?? "").trim())
        next[f.key] = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-11 items-center gap-2 border-b border-border px-4">
        <Icon
          name="sliders-horizontal"
          size={16}
          className="text-muted-foreground"
        />
        <p className="text-[13px] font-semibold text-foreground">
          {selectionCount > 1
            ? `${selectionCount} nodes selected`
            : node
              ? "Node properties"
              : "Workflow settings"}
        </p>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {selectionCount > 1 ? (
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              {selectionCount} nodes selected. Apply bulk actions:
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              leftIcon="copy"
              onClick={onDuplicate}
            >
              Duplicate selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              leftIcon="trash"
              onClick={onDelete}
            >
              Delete selection
            </Button>
          </div>
        ) : node ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 p-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                style={{ color: def?.color }}
              >
                <Icon name={def?.icon ?? "circle"} size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {def?.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {def?.category}
                </p>
              </div>
            </div>

            <Field label="Node name">
              <Input
                value={node.name}
                onChange={(e) => onUpdateNode({ name: e.target.value })}
                inputSize="sm"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={node.description ?? ""}
                onChange={(e) => onUpdateNode({ description: e.target.value })}
                placeholder="What does this node do?"
                rows={2}
              />
            </Field>

            {def && def.fields.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Configuration
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                {def.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    {f.type !== "toggle" && (
                      <Label required={f.required}>{f.label}</Label>
                    )}
                    <FieldInput
                      field={f}
                      value={node.config[f.key]}
                      onChange={(v) => onUpdateConfig(f.key, v)}
                    />
                    {errors[f.key] ? (
                      <p className="flex items-center gap-1 text-[11px] text-destructive">
                        <Icon name="alert-circle" size={12} /> {f.label} is
                        required
                      </p>
                    ) : (
                      f.helper && (
                        <p className="text-[11px] text-muted-foreground">
                          {f.helper}
                        </p>
                      )
                    )}
                  </div>
                ))}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon="check-circle"
                onClick={validate}
              >
                Validate
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={onDuplicate}
                aria-label="Duplicate"
              >
                <Icon name="copy" size={15} />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={onDelete}
                aria-label="Delete"
              >
                <Icon name="trash" size={15} />
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Changes save automatically
            </p>
          </div>
        ) : (
          /* Workflow settings */
          <div className="space-y-4">
            <Field label="Workflow name">
              <Input
                value={meta.name}
                onChange={(e) => onMeta({ name: e.target.value })}
                inputSize="sm"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={meta.description}
                onChange={(e) => onMeta({ description: e.target.value })}
                placeholder="Describe this workflow"
                rows={3}
              />
            </Field>
            <Field label="Trigger type">
              <Select
                value={meta.triggerType}
                onChange={(v) => onMeta({ triggerType: v as TriggerType })}
                options={(
                  ["webhook", "cron", "manual", "email", "api"] as TriggerType[]
                ).map((t) => ({ label: TRIGGER_LABEL[t], value: t }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={meta.status}
                onChange={(v) => onMeta({ status: v as WorkflowStatus })}
                options={(
                  ["draft", "active", "inactive"] as WorkflowStatus[]
                ).map((s) => ({
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                  value: s,
                }))}
              />
            </Field>
            <Field label="Tags">
              <TagsEditor
                tags={meta.tags}
                onChange={(tags) => onMeta({ tags })}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
