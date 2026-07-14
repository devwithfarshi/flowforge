"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/search-input";
import { NODE_CATEGORIES, NODE_DEFINITIONS } from "@/lib/nodes/catalog";
import type { NodeCategoryKey, NodeDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NodeLibraryProps {
  onAdd: (type: string) => void;
}

export function NodeLibrary({ onAdd }: NodeLibraryProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<NodeCategoryKey>>(new Set());

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<NodeCategoryKey, NodeDefinition[]>();
    for (const cat of NODE_CATEGORIES) map.set(cat.key, []);
    for (const def of NODE_DEFINITIONS) {
      if (
        q &&
        !def.label.toLowerCase().includes(q) &&
        !def.description.toLowerCase().includes(q)
      )
        continue;
      map.get(def.category)?.push(def);
    }
    return map;
  }, [query]);

  const toggle = (key: NodeCategoryKey) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nodes
        </p>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search nodes…"
          size="sm"
        />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {NODE_CATEGORIES.map((cat) => {
          const defs = grouped.get(cat.key) ?? [];
          if (query && defs.length === 0) return null;
          const isCollapsed = collapsed.has(cat.key) && !query;
          return (
            <div key={cat.key} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(cat.key)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded"
                  style={{ background: `${cat.color}1f`, color: cat.color }}
                >
                  <Icon name={cat.icon} size={13} />
                </span>
                <span className="flex-1 text-[13px] font-medium text-foreground">
                  {cat.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {defs.length}
                </span>
                <Icon
                  name={isCollapsed ? "chevron-right" : "chevron-down"}
                  size={14}
                  className="text-muted-foreground"
                />
              </button>
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5 pl-1">
                  {defs.map((def) => (
                    <button
                      key={def.type}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/node-type",
                          def.type,
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAdd(def.type)}
                      className={cn(
                        "group flex w-full cursor-grab items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-accent active:cursor-grabbing",
                      )}
                      title={def.description}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border"
                        style={{ color: def.color }}
                      >
                        <Icon name={def.icon} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-foreground">
                          {def.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {def.description}
                        </span>
                      </span>
                      <Icon
                        name="plus"
                        size={13}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
