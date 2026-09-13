import type { EdgeChange, NodeChange } from "@xyflow/react";
import type { StateCreator } from "zustand";
import type { CanvasNodeState, Viewport, WorkflowEdge, WorkflowNode, XY } from "../types";
import type { WorkflowStore } from "./useWorkflowStore";

/* ---------------------------------------------------------------------------
   Canvas slice — EPHEMERAL view state.
   Positions, selection, drag flags, measured sizes and the viewport live
   here. Nothing in this slice is part of the undo history or of a saved
   workflow; you can throw it away and rebuild it from the execution slice
   plus an auto-layout pass.
--------------------------------------------------------------------------- */

export interface CanvasSlice {
  viewport: Viewport;
  nodeStates: Record<string, CanvasNodeState>;
  selectedEdgeIds: readonly string[];
  /** True while an auto-layout transition is running (adds a CSS class that animates node transforms). */
  layoutAnimating: boolean;

  setViewport: (viewport: Viewport) => void;
  /** Ensure every persistent node has a view entry; new nodes get `position`. */
  ensureNodeState: (id: string, position: XY) => void;
  /** Commit many positions in ONE update — used by auto-layout to avoid flicker. */
  setPositions: (positions: ReadonlyMap<string, XY>, animate?: boolean) => void;
  setLayoutAnimating: (value: boolean) => void;
  applyCanvasNodeChanges: (changes: readonly NodeChange<WorkflowNode>[]) => void;
  applyCanvasEdgeChanges: (changes: readonly EdgeChange<WorkflowEdge>[]) => void;
  /** Drop view state for nodes/edges that no longer exist in the execution slice. */
  pruneCanvasState: (nodeIds: readonly string[], edgeIds: readonly string[]) => void;
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const emptyNodeState = (position: XY): CanvasNodeState => ({ position, selected: false, dragging: false });

export const createCanvasSlice: StateCreator<WorkflowStore, [["temporal", unknown]], [], CanvasSlice> = (set) => ({
  viewport: DEFAULT_VIEWPORT,
  nodeStates: {},
  selectedEdgeIds: [],
  layoutAnimating: false,

  setViewport: (viewport) => set({ viewport }),

  ensureNodeState: (id, position) =>
    set((state) => (state.nodeStates[id] ? state : { nodeStates: { ...state.nodeStates, [id]: emptyNodeState(position) } })),

  setPositions: (positions, animate = false) =>
    set((state) => {
      const next: Record<string, CanvasNodeState> = { ...state.nodeStates };
      for (const [id, position] of positions) {
        const prev = next[id] ?? emptyNodeState(position);
        next[id] = { ...prev, position };
      }
      return { nodeStates: next, layoutAnimating: animate };
    }),

  setLayoutAnimating: (value) => set({ layoutAnimating: value }),

  applyCanvasNodeChanges: (changes) =>
    set((state) => {
      let touched = false;
      const next: Record<string, CanvasNodeState> = { ...state.nodeStates };
      for (const change of changes) {
        switch (change.type) {
          case "position": {
            const prev = next[change.id];
            if (!prev) break;
            next[change.id] = {
              ...prev,
              position: change.position ?? prev.position,
              dragging: change.dragging ?? prev.dragging,
            };
            touched = true;
            break;
          }
          case "select": {
            const prev = next[change.id];
            if (!prev || prev.selected === change.selected) break;
            next[change.id] = { ...prev, selected: change.selected };
            touched = true;
            break;
          }
          case "dimensions": {
            const prev = next[change.id];
            if (!prev || !change.dimensions) break;
            const { width, height } = change.dimensions;
            if (prev.measured?.width === width && prev.measured?.height === height) break;
            next[change.id] = { ...prev, measured: { width, height } };
            touched = true;
            break;
          }
          // "add" / "replace" / "remove" are domain operations and are routed to the execution slice.
          default:
            break;
        }
      }
      return touched ? { nodeStates: next } : state;
    }),

  applyCanvasEdgeChanges: (changes) =>
    set((state) => {
      const selected = new Set(state.selectedEdgeIds);
      let touched = false;
      for (const change of changes) {
        if (change.type !== "select") continue;
        if (change.selected && !selected.has(change.id)) {
          selected.add(change.id);
          touched = true;
        } else if (!change.selected && selected.has(change.id)) {
          selected.delete(change.id);
          touched = true;
        }
      }
      return touched ? { selectedEdgeIds: [...selected] } : state;
    }),

  pruneCanvasState: (nodeIds, edgeIds) =>
    set((state) => {
      const keepNodes = new Set(nodeIds);
      const keepEdges = new Set(edgeIds);
      const nodeStates: Record<string, CanvasNodeState> = {};
      let touched = false;
      for (const [id, view] of Object.entries(state.nodeStates)) {
        if (keepNodes.has(id)) nodeStates[id] = view;
        else touched = true;
      }
      const selectedEdgeIds = state.selectedEdgeIds.filter((id) => keepEdges.has(id));
      if (selectedEdgeIds.length !== state.selectedEdgeIds.length) touched = true;
      return touched ? { nodeStates, selectedEdgeIds } : state;
    }),
});
