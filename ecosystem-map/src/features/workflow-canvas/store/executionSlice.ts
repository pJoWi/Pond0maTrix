import type { StateCreator } from "zustand";
import type {
  ActionNodeData,
  ExecutionEdge,
  ExecutionNode,
  ExecutionStatus,
  FilterNodeData,
  NodeDataOf,
  TriggerNodeData,
  WorkflowNodeKind,
} from "../types";
import type { WorkflowStore } from "./useWorkflowStore";

/* ---------------------------------------------------------------------------
   Execution slice — PERSISTENT domain state.
   The DAG definition: nodes with their payload config + schema id, and the
   typed edges between handles. This slice (and only this slice) is tracked
   by the temporal middleware, so undo/redo never touches viewport or drag
   state. Everything here is plain JSON and can be saved as-is.
--------------------------------------------------------------------------- */

export interface ExecutionSlice {
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];

  addNode: (kind: WorkflowNodeKind, id?: string) => ExecutionNode;
  updateNodeData: <K extends WorkflowNodeKind>(id: string, kind: K, patch: Partial<NodeDataOf<K>>) => void;
  setNodeStatus: (id: string, status: ExecutionStatus) => void;
  removeNodes: (ids: readonly string[]) => void;
  addEdge: (edge: ExecutionEdge) => void;
  removeEdges: (ids: readonly string[]) => void;
  replaceGraph: (nodes: readonly ExecutionNode[], edges: readonly ExecutionEdge[]) => void;
}

let counter = 0;
const nextId = (kind: WorkflowNodeKind): string => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const DEFAULT_TRIGGER: TriggerNodeData = {
  label: "New launch",
  schemaId: "trix.launch.v1",
  status: "idle",
  config: { source: "trix.launch" },
};
const DEFAULT_ACTION: ActionNodeData = {
  label: "Send alert",
  schemaId: "alert.webhook.v1",
  status: "idle",
  config: { action: "alert.webhook", payload: {} },
};
const DEFAULT_FILTER: FilterNodeData = {
  label: "Score gate",
  schemaId: "scout.token.v1",
  status: "idle",
  config: { field: "score", operator: "gte", value: 60 },
};

export function createExecutionNode(kind: WorkflowNodeKind, id: string = nextId(kind)): ExecutionNode {
  switch (kind) {
    case "trigger":
      return { id, kind, data: { ...DEFAULT_TRIGGER, config: { ...DEFAULT_TRIGGER.config } } };
    case "action":
      return { id, kind, data: { ...DEFAULT_ACTION, config: { ...DEFAULT_ACTION.config, payload: {} } } };
    case "filter":
      return { id, kind, data: { ...DEFAULT_FILTER, config: { ...DEFAULT_FILTER.config } } };
  }
}

/** Merge a patch into a node, keeping the discriminated union intact. */
function patchNode<K extends WorkflowNodeKind>(node: ExecutionNode, kind: K, patch: Partial<NodeDataOf<K>>): ExecutionNode {
  if (node.kind !== kind) return node;
  switch (node.kind) {
    case "trigger":
      return { ...node, data: { ...node.data, ...(patch as Partial<TriggerNodeData>) } };
    case "action":
      return { ...node, data: { ...node.data, ...(patch as Partial<ActionNodeData>) } };
    case "filter":
      return { ...node, data: { ...node.data, ...(patch as Partial<FilterNodeData>) } };
  }
}

function withStatus(node: ExecutionNode, status: ExecutionStatus): ExecutionNode {
  switch (node.kind) {
    case "trigger":
      return { ...node, data: { ...node.data, status } };
    case "action":
      return { ...node, data: { ...node.data, status } };
    case "filter":
      return { ...node, data: { ...node.data, status } };
  }
}

export const createExecutionSlice: StateCreator<WorkflowStore, [["temporal", unknown]], [], ExecutionSlice> = (set) => ({
  nodes: [],
  edges: [],

  addNode: (kind, id) => {
    const node = createExecutionNode(kind, id);
    set((state) => ({ nodes: [...state.nodes, node] }));
    return node;
  },

  updateNodeData: (id, kind, patch) =>
    set((state) => ({ nodes: state.nodes.map((n) => (n.id === id ? patchNode(n, kind, patch) : n)) })),

  setNodeStatus: (id, status) =>
    set((state) => {
      const target = state.nodes.find((n) => n.id === id);
      if (!target || target.data.status === status) return state;
      return { nodes: state.nodes.map((n) => (n.id === id ? withStatus(n, status) : n)) };
    }),

  removeNodes: (ids) =>
    set((state) => {
      const gone = new Set(ids);
      if (!state.nodes.some((n) => gone.has(n.id))) return state;
      return {
        nodes: state.nodes.filter((n) => !gone.has(n.id)),
        edges: state.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
      };
    }),

  addEdge: (edge) =>
    set((state) => (state.edges.some((e) => e.id === edge.id) ? state : { edges: [...state.edges, edge] })),

  removeEdges: (ids) =>
    set((state) => {
      const gone = new Set(ids);
      const edges = state.edges.filter((e) => !gone.has(e.id));
      return edges.length === state.edges.length ? state : { edges };
    }),

  replaceGraph: (nodes, edges) => set({ nodes: [...nodes], edges: [...edges] }),
});
