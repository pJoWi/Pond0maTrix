import { useCallback, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { seedWorkflowStore } from "../data/seed";
import type { AutoLayoutApi } from "../hooks/useAutoLayout";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasViewport } from "./CanvasViewport";
import "../workflow-canvas.css";

/* ---------------------------------------------------------------------------
   Feature entry point. Mount this anywhere; it brings its own provider,
   store, styles and (optionally) a seeded demo graph.
--------------------------------------------------------------------------- */

interface Props {
  /** Seed a demo workflow when the store is empty (default: true). */
  seed?: boolean;
  /** Rendered as a "back" affordance in the toolbar when provided. */
  onExit?: () => void;
}

export function WorkflowCanvas({ seed = true, onExit }: Props) {
  // Seed synchronously on first render so the initial paint is already laid out.
  if (seed && useWorkflowStore.getState().nodes.length === 0) seedWorkflowStore();

  // Keep ephemeral state in sync with domain removals (undo can also drop nodes).
  useEffect(
    () =>
      useWorkflowStore.subscribe((state, prev) => {
        if (state.nodes === prev.nodes && state.edges === prev.edges) return;
        state.pruneCanvasState(
          state.nodes.map((n) => n.id),
          state.edges.map((e) => e.id),
        );
        // Nodes restored by redo/undo may lack a view entry; give them one so React Flow can place them.
        for (const n of state.nodes) if (!state.nodeStates[n.id]) state.ensureNodeState(n.id, { x: 0, y: 0 });
      }),
    [],
  );

  const renderOverlay = useCallback((layout: AutoLayoutApi) => <CanvasToolbar layout={layout} onExit={onExit} />, [onExit]);

  return (
    <div className="atmosphere relative h-full">
      <Tooltip.Provider delayDuration={300} skipDelayDuration={500}>
        <ReactFlowProvider>
          <CanvasViewport renderOverlay={renderOverlay} />
        </ReactFlowProvider>
      </Tooltip.Provider>
    </div>
  );
}
