import type { CSSProperties, ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { DATA_TYPE_VAR, HANDLE_SCHEMAS } from "../../schema/handles";
import { KIND_ACCENT, KIND_LABEL } from "../../schema/kinds";
import type { ExecutionStatus, HandleSpec, WorkflowNodeKind } from "../../types";

/* ---------------------------------------------------------------------------
   Shared chrome for every workflow node: accent frame, icon, kind tag,
   status dot and the typed handles read from the handle schema. Concrete
   nodes only supply their body (config summary).
--------------------------------------------------------------------------- */

interface Props {
  kind: WorkflowNodeKind;
  icon: LucideIcon;
  label: string;
  schemaId: string;
  status: ExecutionStatus;
  selected: boolean;
  children?: ReactNode;
}

const HANDLE_GAP = 22;

function handleStyle(spec: HandleSpec, index: number, count: number): CSSProperties {
  // Spread handles evenly around the vertical centre of the node body.
  const offset = (index - (count - 1) / 2) * HANDLE_GAP;
  return {
    top: `calc(50% + ${offset}px)`,
    borderColor: `var(${DATA_TYPE_VAR[spec.dataType]})`,
  };
}

export function NodeShell({ kind, icon: Icon, label, schemaId, status, selected, children }: Props) {
  const schema = HANDLE_SCHEMAS[kind];
  return (
    <div
      className={clsx("wf-node", selected && "selected", `status-${status}`)}
      style={{ "--accent": `var(${KIND_ACCENT[kind]})` } as CSSProperties}
    >
      {schema.inputs.map((spec, i) => (
        <Handle
          key={`in-${spec.id}`}
          id={spec.id}
          type="target"
          position={Position.Left}
          title={`${spec.label} · ${spec.dataType}`}
          className="wf-handle"
          style={handleStyle(spec, i, schema.inputs.length)}
        />
      ))}
      {schema.outputs.map((spec, i) => (
        <Handle
          key={`out-${spec.id}`}
          id={spec.id}
          type="source"
          position={Position.Right}
          title={`${spec.label} · ${spec.dataType}`}
          className="wf-handle"
          style={handleStyle(spec, i, schema.outputs.length)}
        />
      ))}

      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="wf-node-icon flex size-7 shrink-0 items-center justify-center rounded-lg">
            <Icon size={14} strokeWidth={2.1} />
          </span>
          <span className="wf-node-tag font-mono text-[9px] tracking-[0.18em] uppercase">{KIND_LABEL[kind]}</span>
          <span className={clsx("wf-status ml-auto size-1.5 rounded-full", `is-${status}`)} title={status} />
        </div>
        <div className="font-display text-[12.5px] leading-snug font-medium text-ink">{label}</div>
        <div className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{children}</div>
        <div className="mt-2 font-mono text-[9px] tracking-wider text-muted/70">{schemaId}</div>
      </div>

      {schema.outputs.length > 1 && (
        <div className="wf-port-labels" aria-hidden>
          {schema.outputs.map((spec, i) => (
            <span key={spec.id} style={{ top: `calc(50% + ${(i - (schema.outputs.length - 1) / 2) * HANDLE_GAP}px)` }}>
              {spec.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
