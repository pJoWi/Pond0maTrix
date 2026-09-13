import { useEffect } from "react";
import { useStore } from "zustand";
import { useWorkflowStore } from "../store/useWorkflowStore";

/* ---------------------------------------------------------------------------
   Undo / redo over the temporal (zundo) store. Only the execution slice is
   tracked, so undoing restores nodes/edges/config while the viewport and
   drag state stay exactly where the user left them.
--------------------------------------------------------------------------- */

export interface WorkflowHistory {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Clear the whole history buffer (e.g. after loading a saved workflow). */
  clear: () => void;
}

export function useWorkflowHistory(bindKeyboard = true): WorkflowHistory {
  const canUndo = useStore(useWorkflowStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useWorkflowStore.temporal, (s) => s.futureStates.length > 0);
  const { undo, redo, clear } = useWorkflowStore.temporal.getState();

  useEffect(() => {
    if (!bindKeyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindKeyboard, undo, redo]);

  return { undo: () => undo(), redo: () => redo(), canUndo, canRedo, clear };
}
