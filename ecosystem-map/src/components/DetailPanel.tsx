import type { CSSProperties } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { CATEGORY_META, type CardData } from "../data/graph";

interface Props {
  data: CardData | null;
  onClose: () => void;
}

export function DetailPanel({ data, onClose }: Props) {
  return (
    <aside
      className="absolute top-20 right-4 bottom-4 z-40 w-[340px] transition-all duration-300 ease-out"
      style={{
        transform: data ? "translateX(0)" : "translateX(calc(100% + 2rem))",
        opacity: data ? 1 : 0,
        pointerEvents: data ? "auto" : "none",
      }}
    >
      {data && (
        <div
          className="flex h-full flex-col overflow-hidden rounded-2xl border bg-surface/90 shadow-2xl shadow-black/30 backdrop-blur-xl"
          style={{ borderColor: `color-mix(in srgb, var(--c-${data.category}) 35%, transparent)` } as CSSProperties}
        >
          {/* Accent crown */}
          <div
            className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, var(--c-${data.category}), transparent 85%)` }}
          />
          <div className="flex items-start justify-between gap-3 p-5 pb-0">
            <div>
              <div
                className="mb-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase"
                style={{
                  color: `var(--c-${data.category})`,
                  background: `color-mix(in srgb, var(--c-${data.category}) 12%, transparent)`,
                }}
              >
                <span className="size-1 rounded-full" style={{ background: `var(--c-${data.category})` }} />
                {CATEGORY_META[data.category].label} · {data.tag}
              </div>
              <h2 className="font-display text-base leading-snug font-semibold text-ink">{data.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pt-4">
            <p className="text-[13px] leading-relaxed text-ink/85">{data.blurb}</p>
            <div className="mt-5 space-y-2.5">
              {data.points.map((p, i) => (
                <div key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-muted">
                  <span
                    className="mt-[7px] size-1.5 shrink-0 rounded-full"
                    style={{ background: `color-mix(in srgb, var(--c-${data.category}) 75%, transparent)` }}
                  />
                  <span>{p}</span>
                </div>
              ))}
            </div>
            {data.link && (
              <a
                href={data.link.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 font-mono text-[11px] text-ink transition-colors hover:bg-surface-2"
              >
                {data.link.label}
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
          <div className="border-t border-line px-5 py-3 font-mono text-[9px] tracking-wider text-muted">
            NOT FINANCIAL ADVICE · MEMECOINS CAN GO TO ZERO
          </div>
        </div>
      )}
    </aside>
  );
}
