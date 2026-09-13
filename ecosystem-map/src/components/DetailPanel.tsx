import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Separator from "@radix-ui/react-separator";
import { ArrowUpRight, X } from "lucide-react";
import { CATEGORY_META, type CardData } from "../data/graph";

interface Props {
  data: CardData | null;
  onClose: () => void;
}

/*
 * Non-modal Radix Dialog: Esc closes and focus is managed, but the canvas
 * behind stays fully interactive (no overlay, outside clicks are handled by
 * the canvas itself — pane click clears, card click re-selects).
 */
export function DetailPanel({ data, onClose }: Props) {
  // Keep the last card during the exit animation so the panel doesn't empty out mid-slide
  // (render-phase derived state; React re-renders immediately with the new value).
  const [shown, setShown] = useState<CardData | null>(data);
  if (data && data !== shown) setShown(data);

  return (
    <Dialog.Root open={data !== null} onOpenChange={(open) => !open && onClose()} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className="detail-panel fixed top-20 right-4 bottom-4 z-40 w-[340px] outline-none"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          {shown && (
            <div
              className="flex h-full flex-col overflow-hidden rounded-2xl border bg-surface/90 shadow-2xl shadow-black/30 backdrop-blur-xl"
              style={{ borderColor: `color-mix(in srgb, var(--c-${shown.category}) 35%, transparent)` } as CSSProperties}
            >
              {/* Accent crown */}
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, var(--c-${shown.category}), transparent 85%)` }}
              />
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div>
                  <div
                    className="mb-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase"
                    style={{
                      color: `var(--c-${shown.category})`,
                      background: `color-mix(in srgb, var(--c-${shown.category}) 12%, transparent)`,
                    }}
                  >
                    <span className="size-1 rounded-full" style={{ background: `var(--c-${shown.category})` }} />
                    {CATEGORY_META[shown.category].label} · {shown.tag}
                  </div>
                  <Dialog.Title asChild>
                    <h2 className="font-display text-base leading-snug font-semibold text-ink">{shown.title}</h2>
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button
                    aria-label="Close details"
                    className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X size={15} />
                  </button>
                </Dialog.Close>
              </div>
              <ScrollArea.Root type="hover" className="min-h-0 flex-1">
                <ScrollArea.Viewport className="h-full w-full p-5 pt-4">
                  <p className="text-[13px] leading-relaxed text-ink/85">{shown.blurb}</p>
                  <div className="mt-5 space-y-2.5">
                    {shown.points.map((p, i) => (
                      <div key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-muted">
                        <span
                          className="mt-[7px] size-1.5 shrink-0 rounded-full"
                          style={{ background: `color-mix(in srgb, var(--c-${shown.category}) 75%, transparent)` }}
                        />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                  {shown.link && (
                    <a
                      href={shown.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 font-mono text-[11px] text-ink transition-colors hover:bg-surface-2"
                    >
                      {shown.link.label}
                      <ArrowUpRight size={12} />
                    </a>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="sa-scrollbar">
                  <ScrollArea.Thumb className="sa-thumb" style={{ background: `color-mix(in srgb, var(--c-${shown.category}) 45%, var(--line-strong))` }} />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
              <Separator.Root decorative className="h-px w-full bg-line" />
              <div className="px-5 py-3 font-mono text-[9px] tracking-wider text-muted">
                NOT FINANCIAL ADVICE · MEMECOINS CAN GO TO ZERO
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
