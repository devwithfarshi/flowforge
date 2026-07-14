"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/builder/geometry";
import { defaultConfig, getNodeDef } from "@/lib/nodes/catalog";
import type { WorkflowEdge, WorkflowNode } from "@/lib/types";
import { uid } from "@/lib/utils";

interface Graph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface Hist {
  present: Graph;
  past: Graph[];
  future: Graph[];
}

const MAX_HISTORY = 60;

export function useBuilderState(initial: Graph) {
  const [hist, setHist] = useState<Hist>({
    present: initial,
    past: [],
    future: [],
  });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const presentRef = useRef<Graph>(hist.present);
  presentRef.current = hist.present;
  const interactionStart = useRef<Graph | null>(null);
  const clipboard = useRef<WorkflowNode[]>([]);

  const commit = useCallback((next: Graph) => {
    setHist((h) => ({
      present: next,
      past: [...h.past, h.present].slice(-MAX_HISTORY),
      future: [],
    }));
  }, []);

  const setLive = useCallback((next: Graph) => {
    setHist((h) => ({ ...h, present: next }));
  }, []);

  /* ---- interactions (drag) ---- */
  const beginInteraction = useCallback(() => {
    interactionStart.current = presentRef.current;
  }, []);

  const endInteraction = useCallback(() => {
    const start = interactionStart.current;
    interactionStart.current = null;
    if (!start) return;
    setHist((h) => ({
      ...h,
      past: [...h.past, start].slice(-MAX_HISTORY),
      future: [],
    }));
  }, []);

  const moveBy = useCallback(
    (ids: Set<string>, dx: number, dy: number) => {
      const g = presentRef.current;
      setLive({
        ...g,
        nodes: g.nodes.map((n) =>
          ids.has(n.id)
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n,
        ),
      });
    },
    [setLive],
  );

  /* ---- discrete edits ---- */
  const addNode = useCallback(
    (type: string, pos: Point) => {
      const def = getNodeDef(type);
      const node: WorkflowNode = {
        id: uid("node"),
        type,
        name: def?.label ?? type,
        position: { x: Math.round(pos.x), y: Math.round(pos.y) },
        config: defaultConfig(type),
        status: "idle",
      };
      const g = presentRef.current;
      commit({ ...g, nodes: [...g.nodes, node] });
      setSelection(new Set([node.id]));
      return node;
    },
    [commit],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<WorkflowNode>) => {
      const g = presentRef.current;
      commit({
        ...g,
        nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [commit],
  );

  const updateNodeConfig = useCallback(
    (id: string, key: string, value: unknown) => {
      const g = presentRef.current;
      commit({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n,
        ),
      });
    },
    [commit],
  );

  const deleteNodes = useCallback(
    (ids: Set<string>) => {
      const g = presentRef.current;
      commit({
        nodes: g.nodes.filter((n) => !ids.has(n.id)),
        edges: g.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      });
      setSelection(new Set());
    },
    [commit],
  );

  const duplicateNodes = useCallback(
    (ids: Set<string>) => {
      const g = presentRef.current;
      const toCopy = g.nodes.filter((n) => ids.has(n.id));
      const newNodes = toCopy.map((n) => ({
        ...n,
        id: uid("node"),
        position: { x: n.position.x + 40, y: n.position.y + 40 },
      }));
      commit({ ...g, nodes: [...g.nodes, ...newNodes] });
      setSelection(new Set(newNodes.map((n) => n.id)));
    },
    [commit],
  );

  const copy = useCallback(() => {
    clipboard.current = presentRef.current.nodes.filter((n) =>
      selection.has(n.id),
    );
  }, [selection]);

  const paste = useCallback(() => {
    if (!clipboard.current.length) return;
    const g = presentRef.current;
    const newNodes = clipboard.current.map((n) => ({
      ...n,
      id: uid("node"),
      position: { x: n.position.x + 32, y: n.position.y + 32 },
    }));
    commit({ ...g, nodes: [...g.nodes, ...newNodes] });
    setSelection(new Set(newNodes.map((n) => n.id)));
  }, [commit]);

  const connect = useCallback(
    (source: string, outputIndex: number, target: string) => {
      if (source === target) return;
      const g = presentRef.current;
      const handle = String(outputIndex);
      if (
        g.edges.some(
          (e) =>
            e.source === source &&
            e.target === target &&
            e.sourceHandle === handle,
        )
      )
        return;
      const edge: WorkflowEdge = {
        id: uid("edge"),
        source,
        target,
        sourceHandle: handle,
      };
      commit({ ...g, edges: [...g.edges, edge] });
    },
    [commit],
  );

  const deleteEdge = useCallback(
    (id: string) => {
      const g = presentRef.current;
      commit({ ...g, edges: g.edges.filter((e) => e.id !== id) });
    },
    [commit],
  );

  /* ---- selection ---- */
  const select = useCallback((ids: string[], additive = false) => {
    setSelection((prev) => {
      if (!additive) return new Set(ids);
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);
  const selectAll = useCallback(
    () => setSelection(new Set(presentRef.current.nodes.map((n) => n.id))),
    [],
  );
  const clearSelection = useCallback(() => setSelection(new Set()), []);

  /* ---- history ---- */
  const undo = useCallback(() => {
    setHist((h) => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      return {
        present: prev,
        past: h.past.slice(0, -1),
        future: [h.present, ...h.future].slice(0, MAX_HISTORY),
      };
    });
  }, []);
  const redo = useCallback(() => {
    setHist((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      return {
        present: next,
        past: [...h.past, h.present].slice(-MAX_HISTORY),
        future: h.future.slice(1),
      };
    });
  }, []);

  const replaceAll = useCallback((graph: Graph) => commit(graph), [commit]);

  return {
    nodes: hist.present.nodes,
    edges: hist.present.edges,
    selection,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    hasClipboard: () => clipboard.current.length > 0,
    actions: useMemo(
      () => ({
        addNode,
        updateNode,
        updateNodeConfig,
        deleteNodes,
        duplicateNodes,
        copy,
        paste,
        connect,
        deleteEdge,
        select,
        selectAll,
        clearSelection,
        beginInteraction,
        endInteraction,
        moveBy,
        undo,
        redo,
        replaceAll,
      }),
      [
        addNode,
        updateNode,
        updateNodeConfig,
        deleteNodes,
        duplicateNodes,
        copy,
        paste,
        connect,
        deleteEdge,
        select,
        selectAll,
        clearSelection,
        beginInteraction,
        endInteraction,
        moveBy,
        undo,
        redo,
        replaceAll,
      ],
    ),
  };
}

export type BuilderApi = ReturnType<typeof useBuilderState>;
