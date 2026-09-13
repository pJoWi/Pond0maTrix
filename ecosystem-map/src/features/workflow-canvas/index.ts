/* Public surface of the workflow-canvas feature. Import from here, not from internals. */
export { WorkflowCanvas } from "./components/WorkflowCanvas";
export { CanvasViewport } from "./components/CanvasViewport";
export { useWorkflowStore, selectFlowNodes, selectFlowEdges } from "./store/useWorkflowStore";
export type { WorkflowStore, ExecutionSnapshot } from "./store/useWorkflowStore";
export { useConnectionValidator, validateConnection } from "./hooks/useConnectionValidator";
export type { ConnectionVerdict } from "./hooks/useConnectionValidator";
export { useAutoLayout } from "./hooks/useAutoLayout";
export { useWorkflowHistory } from "./hooks/useWorkflowHistory";
export { HANDLE_SCHEMAS, isDataTypeCompatible } from "./schema/handles";
export { wouldCreateCycle, topologicalOrder } from "./lib/graph";
export type * from "./types";
