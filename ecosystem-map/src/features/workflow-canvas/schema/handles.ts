import type { HandleSchema, HandleSpec, PortDataType, WorkflowNodeKind } from "../types";

/* ---------------------------------------------------------------------------
   Handle schemas: the single source of truth for which ports a node kind
   exposes and what data type each port carries. Both the node components
   (to render handles) and the connection validator (to accept/reject an
   edge) read from here, so the two can never drift apart.
--------------------------------------------------------------------------- */

export const HANDLE_SCHEMAS: Record<WorkflowNodeKind, HandleSchema> = {
  trigger: {
    inputs: [],
    outputs: [{ id: "out", label: "event", dataType: "event" }],
  },
  action: {
    inputs: [{ id: "in", label: "input", dataType: "any", maxConnections: 1 }],
    outputs: [{ id: "out", label: "result", dataType: "record" }],
  },
  filter: {
    inputs: [{ id: "in", label: "input", dataType: "any", maxConnections: 1 }],
    outputs: [
      { id: "pass", label: "pass", dataType: "record" },
      { id: "reject", label: "reject", dataType: "record" },
    ],
  },
};

/** Which source data types a target port of a given type may receive. */
const ACCEPTS: Record<PortDataType, readonly PortDataType[]> = {
  any: ["event", "record", "boolean", "any"],
  event: ["event"],
  record: ["record", "event"],
  boolean: ["boolean"],
};

export function isDataTypeCompatible(source: PortDataType, target: PortDataType): boolean {
  return ACCEPTS[target].includes(source);
}

export function findHandle(kind: WorkflowNodeKind, direction: "inputs" | "outputs", handleId: string | null | undefined): HandleSpec | undefined {
  const list = HANDLE_SCHEMAS[kind][direction];
  // React Flow passes `null` when a node has exactly one handle of that type and no id was set;
  // our nodes always set ids, so fall back to the first spec only when the list has one entry.
  if (handleId == null) return list.length === 1 ? list[0] : undefined;
  return list.find((h) => h.id === handleId);
}

/** Accent CSS variable per data type, reused by handles and edges for parity. */
export const DATA_TYPE_VAR: Record<PortDataType, string> = {
  event: "--c-trix",
  record: "--c-pond0x",
  boolean: "--c-strategy",
  any: "--c-infra",
};
