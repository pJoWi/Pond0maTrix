import { config } from "../config.js";
import { getJson } from "../util.js";

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  volume?: { h24?: number; h6?: number; h1?: number };
  txns?: { h24?: { buys: number; sells: number }; h1?: { buys: number; sells: number } };
  priceChange?: { h24?: number; h1?: number };
  pairCreatedAt?: number;
}

/** Best SOL pair for a mint (highest liquidity), or null if not bonded / not indexed yet. */
export async function fetchBestPair(mint: string): Promise<DexPair | null> {
  const r = await getJson<DexPair[]>(`${config.dexscreenerBase}/token-pairs/v1/solana/${mint}`);
  const pairs = (r ?? []).filter((p) => p.chainId === "solana" && p.baseToken.address === mint);
  if (!pairs.length) return null;
  pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  return pairs[0];
}

/** Batch lookup (up to 30 mints per call per DexScreener docs). */
export async function fetchPairsBatch(mints: string[]): Promise<Map<string, DexPair>> {
  const out = new Map<string, DexPair>();
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    const r = await getJson<DexPair[]>(`${config.dexscreenerBase}/tokens/v1/solana/${chunk.join(",")}`);
    for (const p of r ?? []) {
      if (p.chainId !== "solana") continue;
      const cur = out.get(p.baseToken.address);
      if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) out.set(p.baseToken.address, p);
    }
  }
  return out;
}

export const dexscreenerUrl = (pairOrMint: string) => `https://dexscreener.com/solana/${pairOrMint}`;
