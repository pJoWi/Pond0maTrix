import { useCallback, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  type CoordinateExtent,
  type Viewport as FlowViewport,
} from "@xyflow/react";
import clsx from "clsx";
import { useAutoLayout, type AutoLayoutApi } from "../hooks/useAutoLayout";
import { useConnectionValidator } from "../hooks/useConnectionValidator";
import { KIND_ACCENT } from "../schema/kinds";
import {
  onEdgesChange,
  onNodesChange,
  selectFlowEdges,
  selectFlowNodes,
  selectLayoutAnimating,
  useWorkflowStore,
} from "../store/useWorkflowStore";
import type { WorkflowEdge, WorkflowNode } from "../types";
import { edgeTypes } from "./edges/edgeTypes";
import { nodeTypes } from "./nodes/nodeTypes";

/* ---------------------------------------------------------------------------
   CanvasViewport — owns everything about the *view*: bounds, zoom range,
   background grid, controls, minimap, and the bridge between React Flow
   change events and the store. It knows nothing about workflow semantics
   beyond the node/edge type maps it mounts.
--------------------------------------------------------------------------- */

/** World-space bounds the user can pan to. Generous but finite so the graph can never be "lost". */
const TRANSLATE_EXTENT: CoordinateExtent = [
  [-4000, -3000],
  [8000, 6000],
];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

interface Props {
  /** Overlay panels (toolbar, legend…) rendered inside the React Flow viewport; receives the layout API. */
  renderOverlay?: (layout: AutoLayoutApi) => ReactNode;
}

function minimapNodeColor(node: WorkflowNode): string {
  return `var(${KIND_ACCENT[node.type]})`;
}

export function CanvasViewport({ renderOverlay }: Props) {
  const nodes = useWorkflowStore(selectFlowNodes);
  const edges = useWorkflowStore(selectFlowEdges);
  const layoutAnimating = useWorkflowStore(selectLayoutAnimating);
  const setViewport = useWorkflowStore((s) => s.setViewport);
  const initialViewport = useWorkflowStore.getState().viewport;

  const validator = useConnectionValidator();
  const layout = useAutoLayout();

  const onViewportChange = useCallback((vp: FlowViewport) => setViewport(vp), [setViewport]);

  return (
    <div className={clsx("wf-canvas relative h-full", layoutAnimating && "wf-layout-animating", !layout.ready && "wf-pending")}>
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={validator.onConnect}
        onConnectEnd={validator.onConnectEnd}
        isValidConnection={validator.isValidConnection}
        connectionMode={ConnectionMode.Strict}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: "var(--line-strong)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
        defaultViewport={initialViewport}
        onViewportChange={onViewportChange}
        translateExtent={TRANSLATE_EXTENT}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        panOnScroll
        zoomOnPinch
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={["Backspace", "Delete"]}
        elevateNodesOnSelect
        elevateEdgesOnSelect
        snapToGrid
        snapGrid={[8, 8]}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="var(--line-strong)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={0} nodeColor={minimapNodeColor} />
        {renderOverlay?.(layout)}
      </ReactFlow>
      {validator.rejection && (
        <div role="status" className="wf-toast">
          {validator.rejection}
        </div>
      )}
    </div>
  );
}
