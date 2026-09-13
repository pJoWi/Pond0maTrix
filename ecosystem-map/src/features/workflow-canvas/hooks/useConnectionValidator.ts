import { useCallback, useEffect, useRef, useState } from "react";
import type { IsValidConnection, OnConnect, OnConnectEnd } from "@xyflow/react";
import { findHandle, isDataTypeCompatible } from "../schema/handles";
import { wouldCreateCycle } from "../lib/graph";
import { useWorkflowStore } from "../store/useWorkflowStore";
import type { ExecutionEdge, ExecutionNode, WorkflowEdge } from "../types";

/* ---------------------------------------------------------------------------
   Connection validation.
   Runs while the user drags a connection line (React Flow calls
   `isValidConnection` on every hover) and once more on commit. Rules:
     1. both endpoints and both handles must exist in the handle schema
     2. source must be an output, target must be an input
     3. data types must be compatible (schema/handles.ts matrix)
     4. target port capacity (maxConnections) must not be exceeded
     5. no duplicate edge
     6. no cycle: the graph must stay a DAG
--------------------------------------------------------------------------- */

export type ConnectionVerdict = { ok: true; edge: ExecutionEdge } | { ok: false; reason: string };

/** Common shape of `Connection` (drag in progress) and `Edge` (React Flow also passes edges to `isValidConnection`). */
interface ConnectionLike {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export function validateConnection(
  nodes: readonly ExecutionNode[],
  edges: readonly ExecutionEdge[],
  conn: ConnectionLike,
): ConnectionVerdict {
  const sourceNode = nodes.find((n) => n.id === conn.source);
  const targetNode = nodes.find((n) => n.id === conn.target);
  if (!sourceNode || !targetNode) return { ok: false, reason: "Unknown node" };
  if (sourceNode.id === targetNode.id) return { ok: false, reason: "A node cannot connect to itself" };

  const out = findHandle(sourceNode.kind, "outputs", conn.sourceHandle);
  const inp = findHandle(targetNode.kind, "inputs", conn.targetHandle);
  if (!out) return { ok: false, reason: "Source port is not an output" };
  if (!inp) return { ok: false, reason: "Target port is not an input" };

  if (!isDataTypeCompatible(out.dataType, inp.dataType)) {
    return { ok: false, reason: `Type mismatch: ${out.dataType} → ${inp.dataType}` };
  }

  const id = `e-${sourceNode.id}:${out.id}->${targetNode.id}:${inp.id}`;
  if (edges.some((e) => e.id === id)) return { ok: false, reason: "Already connected" };

  if (inp.maxConnections !== undefined) {
    const used = edges.filter((e) => e.target === targetNode.id && e.targetHandle === inp.id).length;
    if (used >= inp.maxConnections) return { ok: false, reason: `Port "${inp.label}" accepts ${inp.maxConnections} connection(s)` };
  }

  if (wouldCreateCycle(edges, sourceNode.id, targetNode.id)) {
    return { ok: false, reason: "Would create a cycle — workflows must stay acyclic" };
  }

  return {
    ok: true,
    edge: {
      id,
      source: sourceNode.id,
      sourceHandle: out.id,
      target: targetNode.id,
      targetHandle: inp.id,
      dataType: out.dataType,
    },
  };
}

export interface ConnectionValidator {
  /** Pass to `<ReactFlow isValidConnection>` — evaluated live while dragging. */
  isValidConnection: IsValidConnection<WorkflowEdge>;
  /** Pass to `<ReactFlow onConnect>` — commits the edge to the execution slice. */
  onConnect: OnConnect;
  /** Pass to `<ReactFlow onConnectEnd>` — reports why a dropped connection was refused. */
  onConnectEnd: OnConnectEnd;
  /** Last reason a connection was refused, cleared automatically after a short delay. */
  rejection: string | null;
}

export function useConnectionValidator(): ConnectionValidator {
  const [rejection, setRejection] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const flash = useCallback((reason: string) => {
    setRejection(reason);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRejection(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const lastReason = useRef<string | null>(null);

  const isValidConnection = useCallback<IsValidConnection<WorkflowEdge>>((conn) => {
    const { nodes, edges } = useWorkflowStore.getState();
    const verdict = validateConnection(nodes, edges, conn);
    lastReason.current = verdict.ok ? null : verdict.reason;
    return verdict.ok;
  }, []);

  const onConnect = useCallback<OnConnect>(
    (conn) => {
      const { nodes, edges, addEdge } = useWorkflowStore.getState();
      const verdict = validateConnection(nodes, edges, conn);
      if (verdict.ok) addEdge(verdict.edge);
      else flash(verdict.reason);
    },
    [flash],
  );

  // React Flow never calls onConnect for a rejected drop, so surface the reason here.
  const onConnectEnd = useCallback<OnConnectEnd>(
    (_event, state) => {
      if (state.isValid === false && state.toHandle && lastReason.current) flash(lastReason.current);
      lastReason.current = null;
    },
    [flash],
  );

  return { isValidConnection, onConnect, onConnectEnd, rejection };
}
