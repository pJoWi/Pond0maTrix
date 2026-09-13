import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import { computeDagreLayout, DEFAULT_LAYOUT, NODE_FALLBACK_SIZE, type LayoutOptions } from "../layout/dagreLayout";
import { useWorkflowStore } from "../store/useWorkflowStore";
import type { WorkflowEdge, WorkflowNode } from "../types";

/* ---------------------------------------------------------------------------
   Auto-layout without flicker.

   Why there is no flicker:
   - dagre is synchronous, so all positions are known before we touch state;
   - positions are committed with ONE store update (`setPositions`), so React
     Flow renders old -> new in a single frame, never a half-moved graph;
   - the move itself is animated by a CSS transition that is switched on
     only for the duration of the layout (`layoutAnimating` flag), so normal
     dragging stays instant;
   - `fitView` is requested in the next animation frame, after the nodes have
     their new positions, and animates its own viewport change.
   - on first mount the graph is laid out with measured sizes inside a
     layout effect, before the browser paints the initialised nodes.
--------------------------------------------------------------------------- */

const LAYOUT_TRANSITION_MS = 360;

export interface AutoLayoutApi {
  /** Re-run dagre on the current graph and animate nodes to their new spot. */
  runLayout: (options?: Partial<LayoutOptions>) => void;
  /** True once the first measured layout pass has been applied. */
  ready: boolean;
}

export function useAutoLayout(): AutoLayoutApi {
  const { fitView } = useReactFlow<WorkflowNode, WorkflowEdge>();
  const initialized = useNodesInitialized();
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);

  const layoutNow = useCallback(
    (animate: boolean, overrides?: Partial<LayoutOptions>) => {
      const { nodes, edges, nodeStates, setPositions, setLayoutAnimating } = useWorkflowStore.getState();
      if (nodes.length === 0) return;

      const inputs = nodes.map((n) => {
        const measured = nodeStates[n.id]?.measured;
        return {
          id: n.id,
          width: measured?.width ?? NODE_FALLBACK_SIZE.width,
          height: measured?.height ?? NODE_FALLBACK_SIZE.height,
        };
      });
      const positions = computeDagreLayout(inputs, edges, { ...DEFAULT_LAYOUT, ...overrides });

      // Skip the update entirely when nothing moves — keeps the store referentially stable.
      const moved = [...positions].some(([id, p]) => {
        const cur = nodeStates[id]?.position;
        return !cur || cur.x !== p.x || cur.y !== p.y;
      });
      if (!moved) return;

      setPositions(positions, animate);

      if (timer.current !== null) window.clearTimeout(timer.current);
      if (animate) {
        window.requestAnimationFrame(() => {
          void fitView({ padding: 0.18, duration: LAYOUT_TRANSITION_MS });
        });
        timer.current = window.setTimeout(() => setLayoutAnimating(false), LAYOUT_TRANSITION_MS + 40);
      }
    },
    [fitView],
  );

  // First pass: once React Flow has measured every node, lay out with real sizes.
  // Layout effect: positions + reveal are committed before the browser paints.
  useLayoutEffect(() => {
    if (!initialized || readyRef.current) return;
    readyRef.current = true;
    layoutNow(false);
    void fitView({ padding: 0.18, duration: 0 });
    setReady(true);
  }, [initialized, layoutNow, fitView]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const runLayout = useCallback((options?: Partial<LayoutOptions>) => layoutNow(true, options), [layoutNow]);

  return { runLayout, ready };
}
