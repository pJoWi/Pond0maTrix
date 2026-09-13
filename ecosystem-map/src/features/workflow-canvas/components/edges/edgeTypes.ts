import type { EdgeTypes } from "@xyflow/react";
import { AnimatedGradientEdge } from "./AnimatedGradientEdge";

/** Stable module-level map, same reasoning as nodeTypes. */
export const edgeTypes = {
  gradient: AnimatedGradientEdge,
} satisfies EdgeTypes;
