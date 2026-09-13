import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { KIND_ICON } from "../../schema/kinds";
import type { TriggerNode as TriggerNodeType, TriggerSource } from "../../types";
import { NodeShell } from "./NodeShell";

const SOURCE_LABEL: Record<TriggerSource, string> = {
  "trix.launch": "TRiX · new launch",
  "trix.bonded": "TRiX · bonded to Raydium",
  "scout.score_pass": "pond-scout · score pass",
  webhook: "Inbound webhook",
};

function TriggerNodeComponent({ data, selected }: NodeProps<TriggerNodeType>) {
  const { source, minScore } = data.config;
  return (
    <NodeShell kind="trigger" icon={KIND_ICON.trigger} label={data.label} schemaId={data.schemaId} status={data.status} selected={selected}>
      {SOURCE_LABEL[source]}
      {source === "scout.score_pass" && minScore !== undefined && <span className="text-ink/80"> · score ≥ {minScore}</span>}
    </NodeShell>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
