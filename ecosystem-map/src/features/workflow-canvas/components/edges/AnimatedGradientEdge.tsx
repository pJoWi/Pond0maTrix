import { memo } from "react";
import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps } from "@xyflow/react";
import clsx from "clsx";
import { DATA_TYPE_VAR } from "../../schema/handles";
import { KIND_ACCENT } from "../../schema/kinds";
import type { WorkflowEdge, WorkflowNodeKind } from "../../types";

/* ---------------------------------------------------------------------------
   Gradient edge: fades from the data-type colour at the source to the
   target node's accent colour. `userSpaceOnUse` pins the gradient to the
   actual endpoints, so it stays correct when the path bends back on
   itself. When `data.active` is set (source node running), a dashed overlay
   drifts along the path and a particle travels source -> target.
--------------------------------------------------------------------------- */

function isKind(type: string | undefined): type is WorkflowNodeKind {
  return type === "trigger" || type === "action" || type === "filter";
}

function AnimatedGradientEdgeComponent({
  id,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<WorkflowEdge>) {
  const targetNode = useInternalNode(target);
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const fromVar = DATA_TYPE_VAR[data?.dataType ?? "any"];
  const toVar = isKind(targetNode?.type) ? KIND_ACCENT[targetNode.type] : "--line-strong";
  const gradientId = `wf-grad-${id}`;
  const active = data?.active === true;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={`var(${fromVar})`} />
          <stop offset="100%" stopColor={`var(${toVar})`} />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={clsx("wf-edge", selected && "selected", active && "active")}
        style={{ stroke: `url(#${gradientId})` }}
      />
      {active && (
        <>
          <path d={path} className="wf-edge-flow" style={{ stroke: `url(#${gradientId})` }} />
          <circle r={3} className="wf-edge-particle" style={{ fill: `var(${fromVar})` }}>
            <animateMotion dur="1.6s" repeatCount="indefinite" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          </circle>
        </>
      )}
    </>
  );
}

export const AnimatedGradientEdge = memo(AnimatedGradientEdgeComponent);
