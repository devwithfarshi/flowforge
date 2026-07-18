"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBuilderState } from "@/hooks/use-builder-state";
import { ApiError, api } from "@/lib/api";
import {
  bezierPath,
  graphBounds,
  inputPort,
  NODE_W,
  outputPort,
  type Point,
  rectsIntersect,
  snap,
  toWorld,
  type Viewport,
} from "@/lib/builder/geometry";
import { getNodeDef } from "@/lib/nodes/catalog";
import { subscribeToExecution } from "@/lib/realtime/execution-hub";
import type { Execution, LogEntry, Workflow, WorkflowNode } from "@/lib/types";
import { clamp, download, uid } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { CanvasNode } from "./canvas-node";
import { ExecutionConsole } from "./execution-console";
import { NodeLibrary } from "./node-library";
import { PropertiesPanel, type WorkflowMeta } from "./properties-panel";
import { Toolbar } from "./toolbar";

const NODE_H = 84;

type Interaction =
  | { type: "pan"; sx: number; sy: number; vpX: number; vpY: number }
  | { type: "drag"; ids: Set<string>; lx: number; ly: number; moved: boolean }
  | { type: "marquee"; start: Point; cur: Point; additive: boolean }
  | { type: "connect"; source: string; outputIndex: number; from: Point }
  | null;

export function BuilderWorkspace({ workflow }: { workflow: Workflow }) {
  const router = useRouter();
  const toast = useToast();
  const builder = useBuilderState({
    nodes: workflow.nodes,
    edges: workflow.edges,
  });
  const { nodes, edges, selection, actions } = builder;

  const [meta, setMeta] = useState<WorkflowMeta>({
    name: workflow.name,
    description: workflow.description,
    tags: workflow.tags,
    triggerType: workflow.triggerType,
    status: workflow.status,
  });
  const [viewport, setViewport] = useState<Viewport>({ x: 60, y: 40, zoom: 1 });
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">(
    "saved",
  );
  const [preview, setPreview] = useState<{
    marquee?: { x: number; y: number; w: number; h: number };
    temp?: { from: Point; to: Point };
  }>({});
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  const [runDuration, setRunDuration] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nodeRunStatus, setNodeRunStatus] = useState<
    Record<string, WorkflowNode["status"]>
  >({});
  const [spaceHeld, setSpaceHeld] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction>(null);
  const vpRef = useRef(viewport);
  vpRef.current = viewport;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const spaceRef = useRef(false);
  const saveRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});
  const firstRender = useRef(true);
  // Detaches the current execution's live SignalR stream (set while a run streams).
  const runCleanupRef = useRef<(() => void) | null>(null);

  const rect = () =>
    canvasRef.current?.getBoundingClientRect() ?? new DOMRect();

  /* --------------------------------------------------- save / autosave */
  const save = useCallback(
    async (silent = false) => {
      setSaveState("saving");
      await api.workflows.update(workflow.id, {
        nodes: nodesRef.current,
        edges: builder.edges,
        name: meta.name,
        description: meta.description,
        tags: meta.tags,
        triggerType: meta.triggerType,
        status: meta.status,
      });
      setSaveState("saved");
      if (!silent) toast.success("Workflow saved");
    },
    [workflow.id, builder.edges, meta, toast],
  );
  saveRef.current = save;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(() => saveRef.current(true), 900);
    return () => clearTimeout(t);
  }, [nodes, edges, meta]);

  /* --------------------------------------------------- fit view */
  const fitView = useCallback(() => {
    const b = graphBounds(nodesRef.current, NODE_H);
    const r = rect();
    if (!b || r.width === 0) {
      setViewport({ x: 60, y: 40, zoom: 1 });
      return;
    }
    const pad = 90;
    const zoom = clamp(
      Math.min(r.width / (b.w + pad * 2), r.height / (b.h + pad * 2)),
      0.35,
      1.4,
    );
    setViewport({
      x: r.width / 2 - (b.x + b.w / 2) * zoom,
      y: r.height / 2 - (b.y + b.h / 2) * zoom,
      zoom,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(fitView, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomTo = (factor: number, center?: Point) => {
    setViewport((v) => {
      const r = rect();
      const c = center ?? { x: r.width / 2, y: r.height / 2 };
      const nz = clamp(v.zoom * factor, 0.25, 2.5);
      const wx = (c.x - v.x) / v.zoom;
      const wy = (c.y - v.y) / v.zoom;
      return { x: c.x - wx * nz, y: c.y - wy * nz, zoom: nz };
    });
  };

  /* --------------------------------------------------- wheel: pan + zoom */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = rect();
        zoomTo(e.deltaY < 0 ? 1.12 : 0.89, {
          x: e.clientX - r.left,
          y: e.clientY - r.top,
        });
      } else {
        setViewport((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------- global pointer move/up */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const it = interaction.current;
      if (!it) return;
      if (it.type === "pan") {
        setViewport((v) => ({
          ...v,
          x: it.vpX + (e.clientX - it.sx),
          y: it.vpY + (e.clientY - it.sy),
        }));
      } else if (it.type === "drag") {
        if (!it.moved) {
          actions.beginInteraction();
          it.moved = true;
        }
        const z = vpRef.current.zoom;
        actions.moveBy(
          it.ids,
          (e.clientX - it.lx) / z,
          (e.clientY - it.ly) / z,
        );
        it.lx = e.clientX;
        it.ly = e.clientY;
      } else if (it.type === "marquee") {
        const w = toWorld(
          { x: e.clientX, y: e.clientY },
          vpRef.current,
          rect(),
        );
        it.cur = w;
        const x = Math.min(it.start.x, w.x);
        const y = Math.min(it.start.y, w.y);
        setPreview((p) => ({
          ...p,
          marquee: {
            x,
            y,
            w: Math.abs(w.x - it.start.x),
            h: Math.abs(w.y - it.start.y),
          },
        }));
      } else if (it.type === "connect") {
        const w = toWorld(
          { x: e.clientX, y: e.clientY },
          vpRef.current,
          rect(),
        );
        setPreview((p) => ({ ...p, temp: { from: it.from, to: w } }));
      }
    };
    const onUp = (e: PointerEvent) => {
      const it = interaction.current;
      interaction.current = null;
      if (!it) return;
      if (it.type === "drag" && it.moved) {
        // snap moved nodes to grid
        const moved = nodesRef.current.map((n) =>
          it.ids.has(n.id)
            ? {
                ...n,
                position: { x: snap(n.position.x), y: snap(n.position.y) },
              }
            : n,
        );
        actions.replaceAll({ nodes: moved, edges: builder.edges });
        actions.endInteraction();
      } else if (it.type === "marquee") {
        const r = {
          x: Math.min(it.start.x, it.cur.x),
          y: Math.min(it.start.y, it.cur.y),
          w: Math.abs(it.cur.x - it.start.x),
          h: Math.abs(it.cur.y - it.start.y),
        };
        if (r.w > 4 || r.h > 4) {
          const ids = nodesRef.current
            .filter((n) =>
              rectsIntersect(
                { x: n.position.x, y: n.position.y, w: NODE_W, h: NODE_H },
                r,
              ),
            )
            .map((n) => n.id);
          actions.select(ids, it.additive);
        }
        setPreview((p) => ({ ...p, marquee: undefined }));
      } else if (it.type === "connect") {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const portEl = el?.closest('[data-port-role="in"]');
        const tid = portEl?.getAttribute("data-node-id");
        if (tid) actions.connect(it.source, it.outputIndex, tid);
        setPreview((p) => ({ ...p, temp: undefined }));
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, builder.edges]);

  /* --------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") {
        spaceRef.current = true;
        setSpaceHeld(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? actions.redo() : actions.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        actions.redo();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        actions.selectAll();
      } else if (mod && e.key.toLowerCase() === "c") {
        actions.copy();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        actions.paste();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectionRef.current.size)
          actions.duplicateNodes(selectionRef.current);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectionRef.current.size) {
          e.preventDefault();
          actions.deleteNodes(selectionRef.current);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [actions]);

  /* --------------------------------------------------- canvas interactions */
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const panMode = spaceRef.current || e.button === 1;
    if (panMode) {
      interaction.current = {
        type: "pan",
        sx: e.clientX,
        sy: e.clientY,
        vpX: vpRef.current.x,
        vpY: vpRef.current.y,
      };
    } else {
      const w = toWorld({ x: e.clientX, y: e.clientY }, vpRef.current, rect());
      interaction.current = {
        type: "marquee",
        start: w,
        cur: w,
        additive: e.shiftKey,
      };
      if (!e.shiftKey) actions.clearSelection();
    }
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) {
      actions.select([id], true);
      return;
    }
    const ids = selectionRef.current.has(id)
      ? new Set(selectionRef.current)
      : new Set([id]);
    if (!selectionRef.current.has(id)) actions.select([id]);
    interaction.current = {
      type: "drag",
      ids,
      lx: e.clientX,
      ly: e.clientY,
      moved: false,
    };
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/node-type");
    if (!type) return;
    const w = toWorld({ x: e.clientX, y: e.clientY }, vpRef.current, rect());
    actions.addNode(type, { x: snap(w.x - NODE_W / 2), y: snap(w.y - 30) });
  };

  const addAtCenter = (type: string) => {
    const r = rect();
    const w = toWorld(
      { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      vpRef.current,
      r,
    );
    actions.addNode(type, { x: snap(w.x - NODE_W / 2), y: snap(w.y - 30) });
  };

  /* --------------------------------------------------- run (live SignalR stream) */
  // Tear down the live stream if the builder unmounts mid-run.
  useEffect(() => () => runCleanupRef.current?.(), []);

  const runWorkflow = async () => {
    if (running) return;
    await save(true);
    // Drop any previous run's stream before starting a new one.
    runCleanupRef.current?.();
    runCleanupRef.current = null;
    setRunning(true);
    setRunStatus("running");
    setLogs([]);
    setRunDuration(null);
    setNodeRunStatus({});
    setConsoleOpen(true);
    const startedAt = Date.now();

    // Enqueue the run; the backend streams progress over /hubs/executions.
    let exec: Execution;
    try {
      exec = await api.workflows.run(workflow.id);
    } catch (err) {
      setRunning(false);
      setRunStatus("failed");
      toast.error(
        "Couldn't start run",
        err instanceof ApiError ? err.message : "Please try again.",
      );
      return;
    }

    let settled = false;
    const finish = async (status: "success" | "failed") => {
      if (settled) return;
      settled = true;
      runCleanupRef.current?.();
      runCleanupRef.current = null;
      // Reconcile against the authoritative record so the console is complete
      // even if some early stream messages were missed.
      try {
        const full = await api.executions.get(exec.id);
        setLogs(full.logs);
        setRunDuration(full.durationMs ?? Date.now() - startedAt);
        setNodeRunStatus(
          Object.fromEntries(
            full.nodeRuns.map((nr) => [
              nr.nodeId,
              nr.status === "failed" ? "error" : "success",
            ]),
          ),
        );
      } catch {
        setRunDuration(Date.now() - startedAt);
      }
      setRunStatus(status);
      setRunning(false);
      if (status === "success") toast.success("Execution completed");
      else toast.error("Execution failed", "A node returned an error.");
    };

    runCleanupRef.current = await subscribeToExecution(exec.id, {
      onLog: (entry) => {
        setLogs((prev) => [...prev, entry]);
        const nid = entry.nodeId;
        if (nid) {
          setNodeRunStatus((s) =>
            s[nid] === "success" || s[nid] === "error"
              ? s
              : { ...s, [nid]: "running" },
          );
        }
      },
      onNodeRun: (run) => {
        setNodeRunStatus((s) => ({
          ...s,
          [run.nodeId]:
            run.status === "failed"
              ? "error"
              : run.status === "success"
                ? "success"
                : "running",
        }));
      },
      onStatus: (status) => {
        if (status === "success" || status === "failed") void finish(status);
        else setRunStatus("running");
      },
    });
  };

  /* --------------------------------------------------- toolbar actions */
  const publish = async () => {
    setMeta((m) => ({ ...m, status: "active" }));
    await api.workflows.update(workflow.id, { status: "active" });
    toast.success("Workflow published", "It is now active.");
  };
  const exportJson = () => {
    download(
      `${meta.name.replace(/\s+/g, "-").toLowerCase()}.json`,
      JSON.stringify(
        {
          name: meta.name,
          description: meta.description,
          tags: meta.tags,
          triggerType: meta.triggerType,
          nodes,
          edges,
        },
        null,
        2,
      ),
    );
    toast.success("Workflow exported");
  };
  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const importedNodes: WorkflowNode[] = (data.nodes ?? []).map(
        (n: WorkflowNode) => ({ ...n, id: n.id ?? uid("node") }),
      );
      actions.replaceAll({ nodes: importedNodes, edges: data.edges ?? [] });
      if (data.name)
        setMeta((m) => ({
          ...m,
          name: data.name,
          description: data.description ?? m.description,
          tags: data.tags ?? m.tags,
        }));
      toast.success("Workflow imported");
      setTimeout(fitView, 60);
    } catch {
      toast.error("Import failed", "The file is not valid workflow JSON.");
    }
  };
  const duplicate = async () => {
    const copy = await api.workflows.duplicate(workflow.id);
    toast.success("Workflow duplicated");
    router.push(`/builder/${copy.id}`);
  };

  const selectedNode =
    selection.size === 1
      ? (nodes.find((n) => selection.has(n.id)) ?? null)
      : null;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <Toolbar
        name={meta.name}
        onRename={(name) => setMeta((m) => ({ ...m, name }))}
        status={meta.status}
        saveState={saveState}
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        onUndo={actions.undo}
        onRedo={actions.redo}
        zoom={viewport.zoom}
        onZoomIn={() => zoomTo(1.2)}
        onZoomOut={() => zoomTo(0.83)}
        onFit={fitView}
        onRun={runWorkflow}
        running={running}
        onSave={() => save(false)}
        onPublish={publish}
        onExport={exportJson}
        onImport={importJson}
        onDuplicate={duplicate}
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <NodeLibrary onAdd={addAtCenter} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative min-h-0 flex-1 overflow-hidden"
            style={{
              cursor: spaceHeld ? "grab" : "default",
              backgroundColor: "var(--canvas)",
            }}
            onPointerDown={onCanvasPointerDown}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            {/* Dot grid */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(var(--canvas-dots) 1px, transparent 1px)",
                backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
                backgroundPosition: `${viewport.x}px ${viewport.y}px`,
              }}
            />

            {/* Transformed content */}
            <div
              className="absolute left-0 top-0 h-full w-full"
              style={{
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                transformOrigin: "0 0",
              }}
            >
              <svg
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
                style={{ overflow: "visible" }}
              >
                {edges.map((e) => {
                  const s = nodeMap.get(e.source);
                  const t = nodeMap.get(e.target);
                  if (!s || !t) return null;
                  const from = outputPort(s, Number(e.sourceHandle ?? 0));
                  const to = inputPort(t);
                  return (
                    <g key={e.id} className="pointer-events-auto">
                      <path
                        d={bezierPath(from, to)}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        className="cursor-pointer"
                        onClick={() => {
                          actions.deleteEdge(e.id);
                          toast.info("Connection removed");
                        }}
                      />
                      <path
                        d={bezierPath(from, to)}
                        fill="none"
                        stroke="var(--border-strong)"
                        strokeWidth={2}
                        className="pointer-events-none"
                      />
                    </g>
                  );
                })}
                {preview.temp && (
                  <path
                    d={bezierPath(preview.temp.from, preview.temp.to)}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    className="pointer-events-none"
                  />
                )}
              </svg>

              {/* Marquee */}
              {preview.marquee && (
                <div
                  className="pointer-events-none absolute rounded-sm border border-primary bg-primary/10"
                  style={{
                    left: preview.marquee.x,
                    top: preview.marquee.y,
                    width: preview.marquee.w,
                    height: preview.marquee.h,
                  }}
                />
              )}

              {/* Nodes */}
              {nodes.map((n) => (
                <div key={n.id} className="group">
                  <CanvasNode
                    node={{ ...n, status: nodeRunStatus[n.id] ?? n.status }}
                    def={getNodeDef(n.type)}
                    selected={selection.has(n.id)}
                    onBodyPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onStartConnection={(_e, outputIndex) => {
                      interaction.current = {
                        type: "connect",
                        source: n.id,
                        outputIndex,
                        from: outputPort(n, outputIndex),
                      };
                      setPreview((p) => ({
                        ...p,
                        temp: {
                          from: outputPort(n, outputIndex),
                          to: outputPort(n, outputIndex),
                        },
                      }));
                    }}
                    onDelete={() => actions.deleteNodes(new Set([n.id]))}
                  />
                </div>
              ))}
            </div>

            {/* Empty hint */}
            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border-strong text-muted-foreground">
                  <span className="text-2xl">+</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Drag a node from the left to get started
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Or click a node in the library to add it to the canvas.
                </p>
              </div>
            )}

            {/* Mini legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-md border border-border bg-card/80 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              <span>Scroll to pan</span>
              <span>·</span>
              <span>⌘+Scroll to zoom</span>
              <span>·</span>
              <span>Space+drag to move</span>
            </div>
          </div>

          <ExecutionConsole
            logs={logs}
            running={running}
            status={runStatus}
            durationMs={runDuration}
            open={consoleOpen}
            onToggle={() => setConsoleOpen((o) => !o)}
            onClear={() => {
              setLogs([]);
              setRunStatus("idle");
              setRunDuration(null);
              setNodeRunStatus({});
            }}
          />
        </div>

        <div className="hidden lg:flex">
          <PropertiesPanel
            node={selectedNode}
            selectionCount={selection.size}
            def={selectedNode ? getNodeDef(selectedNode.type) : undefined}
            onUpdateNode={(patch) =>
              selectedNode && actions.updateNode(selectedNode.id, patch)
            }
            onUpdateConfig={(key, value) =>
              selectedNode &&
              actions.updateNodeConfig(selectedNode.id, key, value)
            }
            onDelete={() =>
              actions.deleteNodes(
                selection.size
                  ? selection
                  : new Set(selectedNode ? [selectedNode.id] : []),
              )
            }
            onDuplicate={() =>
              actions.duplicateNodes(
                selection.size
                  ? selection
                  : new Set(selectedNode ? [selectedNode.id] : []),
              )
            }
            meta={meta}
            onMeta={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          />
        </div>
      </div>
    </div>
  );
}
