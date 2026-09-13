import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { KIND_ICON } from "../../schema/kinds";
import type { FilterNode as FilterNodeType, FilterOperator } from "../../types";
import { NodeShell } from "./NodeShell";

const OPERATOR_SYMBOL: Record<FilterOperator, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
  contains: "∋",
};

function FilterNodeComponent({ data, selected }: NodeProps<FilterNodeType>) {
  const { field, operator, value } = data.config;
  return (
    <NodeShell kind="filter" icon={KIND_ICON.filter} label={data.label} schemaId={data.schemaId} status={data.status} selected={selected}>
      <span className="font-mono text-[10.5px] text-ink/85">
        {field} {OPERATOR_SYMBOL[operator]} {String(value)}
      </span>
      <span className="block text-muted/80">pass → continue · reject → branch</span>
    </NodeShell>
  );
}

export const FilterNode = memo(FilterNodeComponent);
