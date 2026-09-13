import type { NodeTypes } from "@xyflow/react";
import { ActionNode } from "./ActionNode";
import { FilterNode } from "./FilterNode";
import { TriggerNode } from "./TriggerNode";

/** Stable module-level map — React Flow warns (and re-mounts nodes) if this object identity changes between renders. */
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode,
} satisfies NodeTypes;
