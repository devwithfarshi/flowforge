import type { WorkflowNode } from "@/lib/types";

export const NODE_W = 224;
export const PORT_Y0 = 30; // first port center, from node top
export const PORT_GAP = 22;
export const GRID = 20;

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function inputPort(node: WorkflowNode): Point {
  return { x: node.position.x, y: node.position.y + PORT_Y0 };
}

export function outputPort(node: WorkflowNode, index = 0): Point {
  return {
    x: node.position.x + NODE_W,
    y: node.position.y + PORT_Y0 + index * PORT_GAP,
  };
}

/** Smooth horizontal bezier between two points. */
export function bezierPath(a: Point, b: Point): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

/** Screen → world coordinates given a viewport. */
export function toWorld(screen: Point, vp: Viewport, rect: DOMRect): Point {
  return {
    x: (screen.x - rect.left - vp.x) / vp.zoom,
    y: (screen.y - rect.top - vp.y) / vp.zoom,
  };
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** Bounding box of all nodes (world coords). */
export function graphBounds(
  nodes: WorkflowNode[],
  nodeHeight = 84,
): { x: number; y: number; w: number; h: number } | null {
  if (!nodes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_W);
    maxY = Math.max(maxY, n.position.y + nodeHeight);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
