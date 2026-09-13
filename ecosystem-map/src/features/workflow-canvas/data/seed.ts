import { computeDagreLayout, NODE_FALLBACK_SIZE } from "../layout/dagreLayout";
import { createExecutionNode } from "../store/executionSlice";
import { useWorkflowStore } from "../store/useWorkflowStore";
import type { ExecutionEdge, ExecutionNode } from "../types";

/* ---------------------------------------------------------------------------
   Demo workflow mirroring the pond-scout pipeline:
   TRiX launch -> score gate -> (pass) alert + watchlist, (reject) nothing.
   Seeding lays the graph out synchronously with fallback sizes BEFORE the
   first render, so the canvas never paints an unpositioned pile of nodes.
--------------------------------------------------------------------------- */

export function buildSeedGraph(): { nodes: ExecutionNode[]; edges: ExecutionEdge[] } {
  const trigger = createExecutionNode("trigger", "t-launch");
  const gate = createExecutionNode("filter", "f-score");
  const alert = createExecutionNode("action", "a-alert");
  const watch = createExecutionNode("action", "a-watch");

  if (watch.kind === "action") {
    watch.data = { ...watch.data, label: "Watchlist", schemaId: "watchlist.v1", config: { action: "watchlist.add", payload: { source: "workflow" } } };
  }
  if (alert.kind === "action") {
    alert.data = { ...alert.data, config: { action: "alert.webhook", payload: { channel: "scout-alerts", mention: true } } };
  }

  const nodes: ExecutionNode[] = [trigger, gate, alert, watch];
  const edges: ExecutionEdge[] = [
    { id: "e-t-launch:out->f-score:in", source: "t-launch", sourceHandle: "out", target: "f-score", targetHandle: "in", dataType: "event" },
    { id: "e-f-score:pass->a-alert:in", source: "f-score", sourceHandle: "pass", target: "a-alert", targetHandle: "in", dataType: "record" },
    { id: "e-f-score:pass->a-watch:in", source: "f-score", sourceHandle: "pass", target: "a-watch", targetHandle: "in", dataType: "record" },
  ];
  return { nodes, edges };
}

/** Load a graph into the store, lay it out, and start a fresh undo history. Idempotent when the store already has nodes. */
export function seedWorkflowStore(force = false): void {
  const store = useWorkflowStore;
  if (!force && store.getState().nodes.length > 0) return;

  const { nodes, edges } = buildSeedGraph();
  const temporal = store.temporal.getState();
  temporal.pause();
  store.getState().replaceGraph(nodes, edges);
  const positions = computeDagreLayout(
    nodes.map((n) => ({ id: n.id, ...NODE_FALLBACK_SIZE })),
    edges,
  );
  store.getState().setPositions(positions, false);
  temporal.resume();
  temporal.clear();
}
