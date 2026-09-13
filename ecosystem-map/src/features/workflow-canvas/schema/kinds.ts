import { Filter, Radio, Zap, type LucideIcon } from "lucide-react";
import type { WorkflowNodeKind } from "../types";

/** Presentation metadata per node kind. Accent vars reuse the atlas palette for design parity. */
export const KIND_ACCENT: Record<WorkflowNodeKind, string> = {
  trigger: "--c-trix",
  action: "--c-pond0x",
  filter: "--c-scout",
};

export const KIND_LABEL: Record<WorkflowNodeKind, string> = {
  trigger: "TRIGGER",
  action: "ACTION",
  filter: "FILTER",
};

export const KIND_ICON: Record<WorkflowNodeKind, LucideIcon> = {
  trigger: Radio,
  action: Zap,
  filter: Filter,
};

export const KIND_ORDER: readonly WorkflowNodeKind[] = ["trigger", "filter", "action"];
