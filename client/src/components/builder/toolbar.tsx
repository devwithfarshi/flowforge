"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { WorkflowStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import type { WorkflowStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "saving" | "dirty";

interface ToolbarProps {
  name: string;
  onRename: (name: string) => void;
  status: WorkflowStatus;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onRun: () => void;
  running: boolean;
  onSave: () => void;
  onPublish: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDuplicate: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    setEditing(false);
    if (draft.trim()) props.onRename(draft.trim());
    else setDraft(props.name);
  };

  const saveLabel =
    props.saveState === "saving"
      ? "Saving…"
      : props.saveState === "dirty"
        ? "Unsaved"
        : "Saved";

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <Link
        href="/workflows"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Back to workflows"
      >
        <Icon name="arrow-left" size={18} />
      </Link>

      <div className="flex min-w-0 items-center gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-48 rounded-md border border-input bg-card px-2 py-1 text-[14px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(props.name);
              setEditing(true);
            }}
            className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent"
          >
            <span className="max-w-[220px] truncate text-[14px] font-semibold text-foreground">
              {props.name}
            </span>
            <Icon
              name="pencil"
              size={13}
              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        )}
        <WorkflowStatusBadge status={props.status} />
        <span
          className={cn(
            "flex items-center gap-1 text-[12px]",
            props.saveState === "saving"
              ? "text-warning"
              : props.saveState === "dirty"
                ? "text-muted-foreground"
                : "text-success",
          )}
        >
          <Icon
            name={
              props.saveState === "saving"
                ? "loader"
                : props.saveState === "dirty"
                  ? "circle-dot"
                  : "check"
            }
            size={12}
            className={props.saveState === "saving" ? "animate-spin" : ""}
          />
          <span className="hidden sm:inline">{saveLabel}</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Undo / redo */}
        <div className="hidden items-center rounded-md border border-border md:flex">
          <Tooltip content="Undo (⌘Z)">
            <button
              type="button"
              onClick={props.onUndo}
              disabled={!props.canUndo}
              className="flex h-7 w-7 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Icon name="rotate-ccw" size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Redo (⌘⇧Z)">
            <button
              type="button"
              onClick={props.onRedo}
              disabled={!props.canRedo}
              className="flex h-7 w-7 items-center justify-center rounded-r-md border-l border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Icon name="rotate-cw" size={15} />
            </button>
          </Tooltip>
        </div>

        {/* Zoom */}
        <div className="hidden items-center rounded-md border border-border lg:flex">
          <button
            type="button"
            onClick={props.onZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon name="zoom-out" size={15} />
          </button>
          <span className="w-11 border-x border-border text-center text-[12px] font-medium tabular-nums text-muted-foreground">
            {Math.round(props.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={props.onZoomIn}
            className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon name="zoom-in" size={15} />
          </button>
          <Tooltip content="Fit to view">
            <button
              type="button"
              onClick={props.onFit}
              className="flex h-7 w-7 items-center justify-center rounded-r-md border-l border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon name="frame" size={15} />
            </button>
          </Tooltip>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon="save"
          onClick={props.onSave}
          className="hidden sm:flex"
        >
          Save
        </Button>
        <Button
          size="sm"
          leftIcon="play"
          loading={props.running}
          onClick={props.onRun}
        >
          Run
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onImport(f);
            e.target.value = "";
          }}
        />
        <Dropdown
          align="end"
          trigger={
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="More"
            >
              <Icon name="more-horizontal" size={16} />
            </button>
          }
        >
          <DropdownItem icon="rocket" onSelect={props.onPublish}>
            Publish
          </DropdownItem>
          <DropdownItem icon="copy" onSelect={props.onDuplicate}>
            Duplicate
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon="download" onSelect={props.onExport}>
            Export JSON
          </DropdownItem>
          <DropdownItem icon="upload" onSelect={() => fileRef.current?.click()}>
            Import JSON
          </DropdownItem>
        </Dropdown>
      </div>
    </div>
  );
}
