import { useReactFlow } from "@xyflow/react";
import * as Separator from "@radix-ui/react-separator";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Maximize2, Moon, Sun, Workflow } from "lucide-react";
import { CATEGORY_META, type Category } from "../data/graph";
import { Tip } from "./ui/Tip";

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  focus: Category | null;
  onFocus: (c: Category | null) => void;
  onOpenWorkflow?: () => void;
}

const iconButton = "cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink";

export function HeaderBar({ dark, onToggleTheme, focus, onFocus, onOpenWorkflow }: Props) {
  const { fitView } = useReactFlow();
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-wrap items-start justify-between gap-3 p-4">
      {/* Identity */}
      <div className="pointer-events-auto rounded-2xl border border-line bg-surface/80 px-5 py-3.5 shadow-2xl shadow-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="relative flex size-8 items-center justify-center">
            <span className="absolute inset-0 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--c-pond0x) 40%, transparent)" }} />
            <span className="absolute inset-[6px] rounded-full border-2" style={{ borderColor: "var(--c-pond0x)" }} />
          </span>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-[0.22em] text-ink">
              POND0MA<span style={{ color: "var(--c-pond0x)" }}>TRIX</span>
            </h1>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted">
              pond0x × trix ecosystem atlas · strategy overlay
            </p>
          </div>
        </div>
      </div>

      {/* Legend / spotlight + controls */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-line bg-surface/80 p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
        <ToggleGroup.Root
          type="single"
          value={focus ?? ""}
          onValueChange={(v) => onFocus(v === "" ? null : (v as Category))}
          aria-label="Spotlight a category"
          className="flex items-center gap-1"
        >
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
            const active = focus === c;
            return (
              <Tip key={c} label={active ? "Clear spotlight" : `Spotlight ${CATEGORY_META[c].label}`}>
                <ToggleGroup.Item
                  value={c}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] tracking-wide transition-all"
                  style={{
                    color: active ? `var(${CATEGORY_META[c].varName})` : "var(--muted)",
                    background: active ? `color-mix(in srgb, var(${CATEGORY_META[c].varName}) 14%, transparent)` : "transparent",
                    boxShadow: active ? `inset 0 0 0 1px color-mix(in srgb, var(${CATEGORY_META[c].varName}) 40%, transparent)` : "none",
                    opacity: focus && !active ? 0.45 : 1,
                  }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: `var(${CATEGORY_META[c].varName})` }} />
                  {CATEGORY_META[c].label}
                </ToggleGroup.Item>
              </Tip>
            );
          })}
        </ToggleGroup.Root>
        <Separator.Root orientation="vertical" decorative className="mx-1 h-5 w-px bg-line-strong" />
        {onOpenWorkflow && (
          <Tip label="Open workflow canvas">
            <button onClick={onOpenWorkflow} className={iconButton}>
              <Workflow size={14} />
            </button>
          </Tip>
        )}
        <Tip label="Fit view">
          <button onClick={() => fitView({ padding: 0.15, duration: 500 })} className={iconButton}>
            <Maximize2 size={14} />
          </button>
        </Tip>
        <Tip label={dark ? "Surface (light mode)" : "Dive (dark mode)"}>
          <button onClick={onToggleTheme} className={iconButton}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </Tip>
      </div>
    </header>
  );
}
