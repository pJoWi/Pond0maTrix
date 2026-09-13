import { create } from "zustand";
import { temporal } from "zundo";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import { createCanvasSlice, type CanvasSlice } from "./canvasSlice";
import { createExecutionSlice, type ExecutionSlice } from "./executionSlice";
import type { ExecutionEdge, ExecutionNode, WorkflowEdge, WorkflowNode } from "../types";

/* ---------------------------------------------------------------------------
   Store composition.
   - Slice pattern: canvas (ephemeral) + execution (persistent).
   - Temporal middleware (zundo) tracks ONLY the execution slice via
     `partialize`, and only records a step when the persistent arrays
     actually changed (`equality`), so panning/zooming/dragging never
     pollutes the undo stack.
--------------------------------------------------------------------------- */

export type WorkflowStore = CanvasSlice & ExecutionSlice;

/** What the undo/redo buffer stores per step. */
export interface ExecutionSnapshot {
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];
}

export const useWorkflowStore = create<WorkflowStore>()(
  temporal(
    (...a) => ({
      ...createCanvasSlice(...a),
      ...createExecutionSlice(...a),
    }),
    {
      partialize: (state): ExecutionSnapshot => ({ nodes: state.nodes, edges: state.edges }),
      equality: (past, current) => past.nodes === current.nodes && past.edges === current.edges,
      limit: 100,
    },
  ),
);

/* ------------------------------------------------------------ bridging */

/**
 * React Flow reports every interaction as a change list. Route each change
 * to the slice that owns it: geometry/selection -> canvas, removal -> execution.
 */
export function onNodesChange(changes: NodeChange<WorkflowNode>[]): void {
  const { applyCanvasNodeChanges, removeNodes } = useWorkflowStore.getState();
  const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
  applyCanvasNodeChanges(changes);
  if (removed.length > 0) removeNodes(removed);
}

export function onEdgesChange(changes: EdgeChange<WorkflowEdge>[]): void {
  const { applyCanvasEdgeChanges, removeEdges } = useWorkflowStore.getState();
  const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
  applyCanvasEdgeChanges(changes);
  if (removed.length > 0) removeEdges(removed);
}

/* ------------------------------------------------------------ selectors */

/**
 * Compose React Flow nodes from execution data + canvas view state.
 * Memoised on the input references so the selector returns a stable array
 * when nothing relevant changed (zustand requires referential stability).
 */
let nodesCacheIn: { nodes: WorkflowStore["nodes"]; states: WorkflowStore["nodeStates"] } | null = null;
let nodesCacheOut: WorkflowNode[] = [];

export function selectFlowNodes(state: WorkflowStore): WorkflowNode[] {
  if (nodesCacheIn && nodesCacheIn.nodes === state.nodes && nodesCacheIn.states === state.nodeStates) return nodesCacheOut;
  nodesCacheIn = { nodes: state.nodes, states: state.nodeStates };
  nodesCacheOut = state.nodes.map((n): WorkflowNode => {
    const view = state.nodeStates[n.id];
    const base = {
      id: n.id,
      position: view?.position ?? { x: 0, y: 0 },
      selected: view?.selected ?? false,
      dragging: view?.dragging ?? false,
      measured: view?.measured,
    };
    switch (n.kind) {
      case "trigger":
        return { ...base, type: "trigger", data: n.data };
      case "action":
        return { ...base, type: "action", data: n.data };
      case "filter":
        return { ...base, type: "filter", data: n.data };
    }
  });
  return nodesCacheOut;
}

let edgesCacheIn: { edges: WorkflowStore["edges"]; nodes: WorkflowStore["nodes"]; selected: WorkflowStore["selectedEdgeIds"] } | null = null;
let edgesCacheOut: WorkflowEdge[] = [];

export function selectFlowEdges(state: WorkflowStore): WorkflowEdge[] {
  if (
    edgesCacheIn &&
    edgesCacheIn.edges === state.edges &&
    edgesCacheIn.nodes === state.nodes &&
    edgesCacheIn.selected === state.selectedEdgeIds
  ) {
    return edgesCacheOut;
  }
  edgesCacheIn = { edges: state.edges, nodes: state.nodes, selected: state.selectedEdgeIds };
  const running = new Set(state.nodes.filter((n) => n.data.status === "running").map((n) => n.id));
  const selected = new Set(state.selectedEdgeIds);
  edgesCacheOut = state.edges.map(
    (e): WorkflowEdge => ({
      id: e.id,
      type: "gradient",
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
      selected: selected.has(e.id),
      data: { dataType: e.dataType, active: running.has(e.source) },
    }),
  );
  return edgesCacheOut;
}

export const selectViewport = (state: WorkflowStore) => state.viewport;
export const selectLayoutAnimating = (state: WorkflowStore) => state.layoutAnimating;
