import { config } from "../config.js";
import { getJson } from "../util.js";

export interface RugReport {
  score: number; // raw rugcheck score (higher = riskier)
  score_normalised?: number;
  risks: { name: string; level: string; description?: string }[];
  mintAuthority: string | null;
  freezeAuthority: string | null;
  totalHolders?: number;
  topHolders?: { address: string; owner: string; pct: number; insider?: boolean }[];
  markets?: { lp?: { lpLockedPct?: number; lpLocked?: number } }[];
  token?: { decimals: number; supply: number };
  detectedAt?: string;
}

export interface RugSummary {
  score: number;
  risks: string[];
  mintAuth: boolean;
  freezeAuth: boolean;
  lpLockedPct: number | null;
  top10Pct: number | null; // share of supply in the 10 largest non-LP holders
  holders: number | null;
}

export async function fetchRug(mint: string): Promise<RugSummary | null> {
  const r = await getJson<RugReport>(`${config.rugcheckBase}/tokens/${mint}/report`, {}, 20000);
  if (!r) return null;
  const lp = r.markets?.map((m) => m.lp?.lpLockedPct).filter((x): x is number => typeof x === "number");
  const lpLockedPct = lp && lp.length ? Math.max(...lp) : null;
  // RugCheck lists LP token accounts among top holders; the LP is the one owned by the pool authority and is usually #1.
  // We conservatively drop the single largest holder if LP is locked (that's the pool), then take the next 10.
  let top10Pct: number | null = null;
  if (r.topHolders?.length) {
    const sorted = [...r.topHolders].sort((a, b) => b.pct - a.pct);
    const list = lpLockedPct !== null && lpLockedPct > 0 ? sorted.slice(1) : sorted;
    top10Pct = list.slice(0, 10).reduce((s, h) => s + h.pct, 0);
  }
  return {
    score: r.score_normalised ?? r.score ?? 0,
    risks: (r.risks ?? []).map((x) => x.name),
    mintAuth: !!r.mintAuthority,
    freezeAuth: !!r.freezeAuthority,
    lpLockedPct,
    top10Pct,
    holders: r.totalHolders ?? null,
  };
}

export const rugcheckUrl = (mint: string) => `https://rugcheck.xyz/tokens/${mint}`;
