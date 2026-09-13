import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

/* Shared Radix tooltip. Requires a <Tooltip.Provider> higher in the tree (App). */

interface Props {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

export function Tip({ label, side = "bottom", children }: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={8}
          collisionPadding={12}
          className="tip-content z-50 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink shadow-xl shadow-black/30 select-none"
        >
          {label}
          <Tooltip.Arrow width={10} height={5} style={{ fill: "var(--surface)" }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
