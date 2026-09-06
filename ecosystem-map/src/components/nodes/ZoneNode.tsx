import type { CSSProperties } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import type { ZoneData } from "../../data/graph";

export function ZoneNode({ data }: NodeProps<Node<ZoneData>>) {
  return (
    <div
      className={`pmx-zone ${data.dimmed ? "dimmed" : ""}`}
      style={{ "--accent": `var(--c-${data.category})`, opacity: data.dimmed ? 0.12 : undefined } as CSSProperties}
    >
      <div className={`flex h-full flex-col gap-1 p-5 ${data.labelPos === "bottom" ? "justify-end" : ""}`}>
        <span className="pmx-zone-label">{data.label}</span>
        <span className="pmx-zone-sub">{data.sub}</span>
      </div>
    </div>
  );
}
