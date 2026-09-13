import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { KIND_ICON } from "../../schema/kinds";
import type { ActionNode as ActionNodeType, ActionType } from "../../types";
import { NodeShell } from "./NodeShell";

const ACTION_LABEL: Record<ActionType, string> = {
  "alert.webhook": "Post alert to webhook",
  "watchlist.add": "Add mint to watchlist",
  "jupiter.quote": "Fetch Jupiter quote",
  "jupiter.buy": "Buy via Jupiter (manual confirm)",
};

function ActionNodeComponent({ data, selected }: NodeProps<ActionNodeType>) {
  const { action, payload } = data.config;
  const keys = Object.keys(payload);
  return (
    <NodeShell kind="action" icon={KIND_ICON.action} label={data.label} schemaId={data.schemaId} status={data.status} selected={selected}>
      {ACTION_LABEL[action]}
      {keys.length > 0 && (
        <span className="mt-1 block font-mono text-[9.5px] text-muted/80">
          {keys.length} payload key{keys.length === 1 ? "" : "s"}: {keys.slice(0, 3).join(", ")}
          {keys.length > 3 ? "…" : ""}
        </span>
      )}
    </NodeShell>
  );
}

export const ActionNode = memo(ActionNodeComponent);
