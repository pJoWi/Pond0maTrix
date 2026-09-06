/**
 * TRiX (trix.market) — Jimmy Edgar's launchpad in the Pond0x ecosystem.
 * Endpoints discovered from the site's own frontend (unofficial, may change):
 *   GET  /api/launches?limit=N&offset=N&sort=createdAt|marketCap   -> { items: Launch[], total }
 *   GET  /api/token/<mint>                                          -> TokenDetail
 *   POST /api/prices/batch { mints: [] }                            -> { [mint]: {price, change24h, change1h, volume24h, mcap} }
 *   GET  /api/boosts/active                                         -> [{ chain, tokenAddress, expiresAt }]
 *   GET  /api/coin-verifications                                    -> [{ chain, tokenAddress }]
 * NOTE: `poolAddress` is null even for tokens that have bonded to Raydium — do NOT use it to detect bonding.
 * Bonding is detected via DexScreener (a SOL pair exists).
 */
import { config } from "../config.js";
import { getJson } from "../util.js";

export interface TrixLaunch {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  totalSupply: string;
  mintAddress: string;
  poolAddress: string | null;
  status: string;
  totalCreatorFeeClaimed: string;
  totalPlatformFeeClaimed: string;
  hidden: boolean;
  isCoinAgent: boolean;
  marketCap: number | string | null;
  lastActivityAt: string | null;
  createdAt: string;
  creator: { username: string; walletAddress: string; isVerified: boolean; points: number; avatarUrl?: string } | null;
}

export interface TrixPrice { price: number; change24h: number; change1h?: number; volume24h: number; mcap: number }

const H = { origin: config.trixBase, referer: config.trixBase + "/" };

export async function fetchLaunches(limit = 200, sort: "createdAt" | "marketCap" = "createdAt", offset = 0): Promise<TrixLaunch[]> {
  const r = await getJson<{ items: TrixLaunch[]; total: number }>(`${config.trixBase}/api/launches?limit=${limit}&offset=${offset}&sort=${sort}`, { headers: H });
  return (r?.items ?? []).filter((l) => l.chain === "solana" && !l.hidden);
}

/** Pull the whole catalogue (≈1000 launches) — used once at startup to build creator history. */
export async function fetchAllLaunches(): Promise<TrixLaunch[]> {
  const out: TrixLaunch[] = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const page = await fetchLaunches(500, "marketCap", offset);
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

export async function fetchPrices(mints: string[]): Promise<Record<string, TrixPrice>> {
  if (!mints.length) return {};
  const r = await getJson<Record<string, TrixPrice>>(`${config.trixBase}/api/prices/batch`, {
    method: "POST",
    headers: { ...H, "content-type": "application/json" },
    body: JSON.stringify({ mints }),
  });
  return r ?? {};
}

export async function fetchActiveBoosts(): Promise<Set<string>> {
  const r = await getJson<{ chain: string; tokenAddress: string; expiresAt: string }[]>(`${config.trixBase}/api/boosts/active`, { headers: H });
  return new Set((r ?? []).filter((b) => b.chain === "solana").map((b) => b.tokenAddress));
}

export async function fetchCoinVerifications(): Promise<Set<string>> {
  const r = await getJson<{ chain: string; tokenAddress: string }[]>(`${config.trixBase}/api/coin-verifications`, { headers: H });
  return new Set((r ?? []).filter((b) => b.chain === "solana").map((b) => b.tokenAddress));
}

export const trixTokenUrl = (mint: string) => `${config.trixBase}/coin/${mint}`;

export const mcapNum = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
