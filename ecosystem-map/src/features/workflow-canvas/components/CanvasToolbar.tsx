import { useCallback } from "react";
import { Panel, useReactFlow } from "@xyflow/react";
import * as Separator from "@radix-ui/react-separator";
import clsx from "clsx";
import { ArrowLeft, LayoutDashboard, Play, Plus, Redo2, Undo2 } from "lucide-react";
import { Tip } from "../../../components/ui/Tip";
import type { AutoLayoutApi } from "../hooks/useAutoLayout";
import { useWorkflowHistory } from "../hooks/useWorkflowHistory";
import { KIND_ACCENT, KIND_ICON, KIND_LABEL, KIND_ORDER } from "../schema/kinds";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { simulateRun } from "../lib/simulate";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeKind } from "../types";

/* ---------------------------------------------------------------------------
   Toolbar overlay: add nodes, auto-layout, undo/redo, simulated run.
   Visual language mirrors HeaderBar (frosted surface, mono labels).
--------------------------------------------------------------------------- */

interface Props {
  layout: AutoLayoutApi;
  onExit?: () => void;
}

const iconButton =
  "flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted";

export function CanvasToolbar({ layout, onExit }: Props) {
  const { undo, redo, canUndo, canRedo } = useWorkflowHistory();
  const { screenToFlowPosition } = useReactFlow<WorkflowNode, WorkflowEdge>();
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const running = useWorkflowStore((s) => s.nodes.some((n) => n.data.status === "running"));

  const addNode = useCallback(
    (kind: WorkflowNodeKind) => {
      const { addNode: add, ensureNodeState } = useWorkflowStore.getState();
      const node = add(kind);
      // Drop new nodes near the visual centre of the canvas, slightly jittered so repeats don't stack.
      const centre = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const jitter = (Math.random() - 0.5) * 80;
      ensureNodeState(node.id, { x: Math.round(centre.x - 120 + jitter), y: Math.round(centre.y - 56 + jitter) });
    },
    [screenToFlowPosition],
  );

  return (
    <Panel position="top-left" className="pointer-events-auto m-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface/80 p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
        {onExit && (
          <>
            <Tip label="Back to the atlas">
              <button type="button" onClick={onExit} className={iconButton}>
                <ArrowLeft size={13} />
                atlas
              </button>
            </Tip>
            <Separator.Root orientation="vertical" decorative className="mx-1 h-5 w-px bg-line-strong" />
          </>
        )}
        <span className="px-1.5 font-display text-[11px] font-semibold tracking-[0.2em] text-ink">WORKFLOW</span>
        <Separator.Root orientation="vertical" decorative className="mx-1 h-5 w-px bg-line-strong" />
        {KIND_ORDER.map((kind) => {
          const Icon = KIND_ICON[kind];
          return (
            <Tip key={kind} label={`Add ${KIND_LABEL[kind].toLowerCase()} node`}>
              <button
                type="button"
                onClick={() => addNode(kind)}
                className={iconButton}
                style={{ color: `var(${KIND_ACCENT[kind]})` }}
              >
                <Plus size={11} />
                <Icon size={13} />
                {KIND_LABEL[kind].toLowerCase()}
              </button>
            </Tip>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface/80 p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
        <Tip label="Undo (Ctrl+Z)">
          <button type="button" onClick={undo} disabled={!canUndo} className={iconButton}>
            <Undo2 size={13} />
          </button>
        </Tip>
        <Tip label="Redo (Ctrl+Shift+Z)">
          <button type="button" onClick={redo} disabled={!canRedo} className={iconButton}>
            <Redo2 size={13} />
          </button>
        </Tip>
        <Separator.Root orientation="vertical" decorative className="mx-1 h-5 w-px bg-line-strong" />
        <Tip label="Auto-layout (dagre, left → right)">
          <button type="button" onClick={() => layout.runLayout()} disabled={nodeCount === 0} className={iconButton}>
            <LayoutDashboard size={13} />
            layout
          </button>
        </Tip>
        <Tip label="Simulate a run through the DAG">
          <button
            type="button"
            onClick={() => void simulateRun()}
            disabled={nodeCount === 0 || running}
            className={clsx(iconButton, running && "text-ink")}
          >
            <Play size={13} />
            {running ? "running…" : "simulate"}
          </button>
        </Tip>
      </div>
    </Panel>
  );
}
