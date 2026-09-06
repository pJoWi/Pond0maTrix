import type { CSSProperties } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Bell, Coins, Database, Fingerprint, Gauge, KeyRound, Layers, LogOut, Megaphone,
  Monitor, Pickaxe, Radar, RefreshCw, Rocket, Route, Scan, Server, Shield, ShieldAlert,
  Sparkles, Sunrise, Terminal, TrendingUp, User, Wand2, Waves, Zap, type LucideIcon,
} from "lucide-react";
import type { CardData } from "../../data/graph";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, coins: Coins, pickaxe: Pickaxe, user: User, rocket: Rocket,
  "trending-up": TrendingUp, megaphone: Megaphone, zap: Zap, layers: Layers, waves: Waves,
  radar: Radar, route: Route, shield: Shield, server: Server, scan: Scan, refresh: RefreshCw,
  gauge: Gauge, database: Database, bell: Bell, monitor: Monitor, key: KeyRound,
  terminal: Terminal, sunrise: Sunrise, "shield-alert": ShieldAlert, fingerprint: Fingerprint,
  "log-out": LogOut, wand: Wand2,
};

export function CardNode({ data, selected }: NodeProps<Node<CardData>>) {
  const Icon = ICONS[data.icon] ?? Sparkles;
  const order = (data.enterOrder as number) ?? 0;
  return (
    <div
      className={`pmx-node group ${selected ? "selected" : ""} ${data.dimmed ? "dimmed" : ""}`}
      style={
        {
          "--accent": `var(--c-${data.category})`,
          "--halo": `var(--halo-${data.category})`,
          "--enter-delay": `${order * 45}ms`,
        } as CSSProperties
      }
    >
      {(["t", "l", "r", "b"] as const).map((side) => {
        const pos = { t: Position.Top, l: Position.Left, r: Position.Right, b: Position.Bottom }[side];
        return (
          <span key={side}>
            <Handle id={`s-${side}`} type="source" position={pos} style={{ borderColor: "var(--accent)" }} />
            <Handle id={`t-${side}`} type="target" position={pos} style={{ borderColor: "var(--accent)" }} />
          </span>
        );
      })}
      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--accent) 16%, transparent)",
              color: "var(--accent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            <Icon size={14} strokeWidth={2.1} />
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.18em] uppercase"
            style={{ color: "color-mix(in srgb, var(--accent) 80%, var(--muted))" }}
          >
            {data.tag}
          </span>
        </div>
        <div className="font-display text-[12.5px] leading-snug font-medium text-ink">{data.title}</div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{data.caption}</p>
      </div>
    </div>
  );
}
