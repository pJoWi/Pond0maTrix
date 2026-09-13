import type { Edge, Node } from "@xyflow/react";

/* ---------------------------------------------------------------------------
   Domain types for the workflow canvas.

   Two worlds are kept apart on purpose:
   - Execution data (this file's *Data / *Config types, WorkflowEdge) is the
     persistent DAG definition: what runs, with which payload, in which order.
   - Canvas data (CanvasNodeState, Viewport) is ephemeral UI state: where a
     node sits on screen, what is selected, how far the user zoomed.
   The store composes both into React Flow nodes at read time (see store/).
--------------------------------------------------------------------------- */

/** Node kinds the canvas knows how to render and execute. */
export type WorkflowNodeKind = "trigger" | "action" | "filter";

/** Data types that can flow over a connection. Handle compatibility is checked on these. */
export type PortDataType = "event" | "record" | "boolean" | "any";

/** Static description of a single connection point on a node. */
export interface HandleSpec {
  /** Stable id, used as React Flow `sourceHandle` / `targetHandle`. */
  id: string;
  label: string;
  dataType: PortDataType;
  /** Maximum simultaneous connections; `undefined` = unlimited. */
  maxConnections?: number;
}

/** Complete handle schema of a node kind. */
export interface HandleSchema {
  inputs: readonly HandleSpec[];
  outputs: readonly HandleSpec[];
}

/* --------------------------------------------------------------- node data */

export type ExecutionStatus = "idle" | "running" | "success" | "error";

interface BaseNodeData extends Record<string, unknown> {
  label: string;
  /** Identifier of the payload schema this node validates against. */
  schemaId: string;
  status: ExecutionStatus;
}

export type TriggerSource = "trix.launch" | "trix.bonded" | "scout.score_pass" | "webhook";

export interface TriggerNodeData extends BaseNodeData {
  config: {
    source: TriggerSource;
    /** Minimum score for `scout.score_pass`, ignored otherwise. */
    minScore?: number;
  };
}

export type ActionType = "alert.webhook" | "watchlist.add" | "jupiter.quote" | "jupiter.buy";

export interface ActionNodeData extends BaseNodeData {
  config: {
    action: ActionType;
    /** Free-form JSON payload passed to the action. */
    payload: Record<string, string | number | boolean>;
  };
}

export type FilterOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";

export interface FilterNodeData extends BaseNodeData {
  config: {
    field: string;
    operator: FilterOperator;
    value: string | number | boolean;
  };
}

export type WorkflowNodeData = TriggerNodeData | ActionNodeData | FilterNodeData;

/* ------------------------------------------------------- React Flow types */

export type TriggerNode = Node<TriggerNodeData, "trigger">;
export type ActionNode = Node<ActionNodeData, "action">;
export type FilterNode = Node<FilterNodeData, "filter">;
export type WorkflowNode = TriggerNode | ActionNode | FilterNode;

export interface GradientEdgeData extends Record<string, unknown> {
  /** Data type travelling over this edge, drives the gradient colour. */
  dataType: PortDataType;
  /** When true the dash pattern animates to show data in flight. */
  active?: boolean;
}

export type WorkflowEdge = Edge<GradientEdgeData, "gradient">;

/* ---------------------------------------------------- persistent (domain) */

/** Persistent definition of one node — everything except where it is drawn. Discriminated on `kind`. */
export type ExecutionNode =
  | { id: string; kind: "trigger"; data: TriggerNodeData }
  | { id: string; kind: "action"; data: ActionNodeData }
  | { id: string; kind: "filter"; data: FilterNodeData };

/** Node data type for a given kind. */
export type NodeDataOf<K extends WorkflowNodeKind> = Extract<ExecutionNode, { kind: K }>["data"];

/** Persistent definition of one connection between two handles. */
export interface ExecutionEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  dataType: PortDataType;
}

/* ------------------------------------------------------- ephemeral (view) */

export interface XY {
  x: number;
  y: number;
}

export interface Viewport extends XY {
  zoom: number;
}

/** Per-node view state. Never persisted, never part of the undo history. */
export interface CanvasNodeState {
  position: XY;
  selected: boolean;
  dragging: boolean;
  /** Last measured size, reported by React Flow after mount. */
  measured?: { width: number; height: number };
}
