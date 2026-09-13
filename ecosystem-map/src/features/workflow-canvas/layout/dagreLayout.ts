import dagre from "@dagrejs/dagre";
import type { DirectedEdge } from "../lib/graph";
import type { XY } from "../types";

/* ---------------------------------------------------------------------------
   Dagre auto-layout. Synchronous and pure: give it node sizes + edges, get
   top-left positions back. Because it is synchronous the caller can commit
   every new position in one store update, which is what keeps the canvas
   from flickering (no intermediate frame with half-moved nodes).
--------------------------------------------------------------------------- */

export interface LayoutNodeInput {
  id: string;
  width: number;
  height: number;
}

export interface LayoutOptions {
  direction: "LR" | "TB";
  /** Horizontal gap between ranks (columns in LR). */
  rankSep: number;
  /** Vertical gap between siblings. */
  nodeSep: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { direction: "LR", rankSep: 96, nodeSep: 48 };

/** Fallback size used before React Flow has measured a node (matches `.wf-node` CSS width). */
export const NODE_FALLBACK_SIZE = { width: 248, height: 112 } as const;

export function computeDagreLayout(
  nodes: readonly LayoutNodeInput[],
  edges: readonly DirectedEdge[],
  options: LayoutOptions = DEFAULT_LAYOUT,
): Map<string, XY> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: options.direction, ranksep: options.rankSep, nodesep: options.nodeSep, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: n.width, height: n.height });
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const positions = new Map<string, XY>();
  for (const n of nodes) {
    const placed = g.node(n.id);
    // dagre reports the centre; React Flow positions by top-left corner.
    positions.set(n.id, {
      x: Math.round(placed.x - n.width / 2),
      y: Math.round(placed.y - n.height / 2),
    });
  }
  return positions;
}
