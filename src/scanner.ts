/**
 * Scanner loop:
 *   1. every SCAN_INTERVAL_SEC: pull newest TRiX launches + boosts + verifications + prices, upsert, score, alert
 *   2. every ENRICH_INTERVAL_SEC: for young/watched tokens, refresh DexScreener (bond detection, liq, flow) + RugCheck (safety)
 * Creator history is built from the full TRiX catalogue at startup and refreshed hourly.
 */
import { config } from "./config.js";
import { addSnapshot, getToken, kvGet, kvSet, tokensToEnrich, upsertToken, type TokenRow } from "./db.js";
import { emitAlert, bus } from "./alerts.js";
import { scoreToken } from "./scoring.js";
import { fetchActiveBoosts, fetchAllLaunches, fetchCoinVerifications, fetchLaunches, fetchPrices, mcapNum, type TrixLaunch } from "./sources/trix.js";
import { fetchPairsBatch } from "./sources/dexscreener.js";
import { fetchRug } from "./sources/rugcheck.js";
import { fmtUsd, minutesSince, sleep } from "./util.js";

interface CreatorStats { launches: number; bestMcap: number; dead: number }
let creatorStats = new Map<string, CreatorStats>();
let creatorStatsAt = 0;

async function refreshCreatorStats(): Promise<void> {
  if (Date.now() - creatorStatsAt < 3600e3 && creatorStats.size) return;
  const all = await fetchAllLaunches();
  const m = new Map<string, CreatorStats>();
  for (const l of all) {
    const w = l.creator?.walletAddress;
    if (!w) continue;
    const st = m.get(w) ?? { launches: 0, bestMcap: 0, dead: 0 };
    const mc = mcapNum(l.marketCap) ?? 0;
    st.launches++;
    st.bestMcap = Math.max(st.bestMcap, mc);
    if (mc < 2000 && minutesSince(l.createdAt) > 24 * 60) st.dead++;
    m.set(w, st);
  }
  creatorStats = m;
  creatorStatsAt = Date.now();
  console.log(`creator stats: ${all.length} launches, ${m.size} creators`);
}

function rescore(mint: string): TokenRow | undefined {
  const t = getToken(mint);
  if (!t) return;
  const { score, reasons } = scoreToken(t);
  upsertToken({ mint, score, score_reasons: JSON.stringify(reasons) });
  const u = getToken(mint)!;
  bus.emit("token", u);
  return u;
}

function applyLaunch(l: TrixLaunch, boosts: Set<string>, verified: Set<string>, price?: { mcap: number; volume24h: number; change24h: number }): { isNew: boolean; wasBoosted: boolean } {
  const existing = getToken(l.mintAddress);
  const cw = l.creator?.walletAddress ?? null;
  const cs = cw ? creatorStats.get(cw) : undefined;
  const thisMcap = price?.mcap ?? mcapNum(l.marketCap);
  upsertToken({
    mint: l.mintAddress,
    name: l.name, symbol: l.symbol, description: l.description, logo_url: l.logoUrl,
    created_at: l.createdAt,
    creator_wallet: cw, creator_username: l.creator?.username ?? null,
    creator_verified: l.creator?.isVerified ? 1 : 0, creator_points: l.creator?.points ?? 0,
    creator_launches: cs?.launches ?? 1,
    // "other launches" stats: subtract this token from the creator totals
    creator_best_mcap: cs ? (cs.bestMcap === (thisMcap ?? -1) ? 0 : cs.bestMcap) : 0,
    creator_dead_launches: cs ? Math.max(0, cs.dead - ((thisMcap ?? 0) < 2000 && minutesSince(l.createdAt) > 24 * 60 ? 1 : 0)) : 0,
    boosted: boosts.has(l.mintAddress) ? 1 : 0,
    coin_verified: verified.has(l.mintAddress) ? 1 : 0,
    trix_mcap: thisMcap,
    trix_vol24: price?.volume24h ?? existing?.trix_vol24 ?? null,
    trix_change24: price?.change24h ?? existing?.trix_change24 ?? null,
    creator_fee_claimed: Number(l.totalCreatorFeeClaimed ?? 0) || 0,
  });
  return { isNew: !existing, wasBoosted: !!existing?.boosted };
}

export async function scanOnce(): Promise<void> {
  await refreshCreatorStats();
  const [launches, boosts, verified] = await Promise.all([fetchLaunches(150, "createdAt"), fetchActiveBoosts(), fetchCoinVerifications()]);
  if (!launches.length) { console.warn("TRiX returned no launches (rate limit / down?)"); return; }
  const prices = await fetchPrices(launches.map((l) => l.mintAddress));
  const firstRun = kvGet("first_scan_done") !== "1";

  for (const l of launches) {
    const { isNew, wasBoosted } = applyLaunch(l, boosts, verified, prices[l.mintAddress]);
    const t = rescore(l.mintAddress);
    if (!t) continue;
    addSnapshot(t);
    if (firstRun) continue; // don't spam 150 alerts on first start
    if (isNew) emitAlert(t, "NEW_LAUNCH", `New TRiX launch by ${t.creator_username ?? "?"} (${t.creator_launches - 1} prior). ${t.description ?? ""}`.trim());
    if (!wasBoosted && t.boosted) emitAlert(t, "BOOSTED", "Token just got boosted on TRiX (paid attention slot).");
    if (t.score >= config.alertScoreMin) emitAlert(t, "SCORE_PASS", `Score ${t.score} ≥ ${config.alertScoreMin}. ${JSON.parse(t.score_reasons).slice(0, 4).join(" · ")}`);
  }
  if (firstRun) { kvSet("first_scan_done", "1"); console.log(`initial catalogue loaded (${launches.length} newest launches). Alerts start from the next scan.`); }
}

export async function enrichOnce(): Promise<void> {
  const batch = tokensToEnrich(config.trackMaxAgeHours, config.enrichIntervalSec, 30);
  if (!batch.length) return;
  const pairs = await fetchPairsBatch(batch.map((t) => t.mint));
  for (const t of batch) {
    const p = pairs.get(t.mint);
    const patch: Partial<TokenRow> & { mint: string } = { mint: t.mint, last_enriched_at: new Date().toISOString() };
    let justBonded = false;
    if (p) {
      justBonded = t.stage !== "bonded";
      patch.stage = "bonded";
      patch.pair_address = p.pairAddress;
      patch.bonded_at = t.bonded_at ?? (p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : new Date().toISOString());
      patch.price_usd = p.priceUsd ? Number(p.priceUsd) : null;
      patch.liquidity_usd = p.liquidity?.usd ?? null;
      patch.vol24_usd = p.volume?.h24 ?? null;
      patch.buys24 = p.txns?.h24?.buys ?? null;
      patch.sells24 = p.txns?.h24?.sells ?? null;
      if (p.marketCap) patch.trix_mcap = p.marketCap;
    }
    // RugCheck: once for curve tokens (authorities), and re-check bonded ones (LP lock, holders) — throttle to every 3rd enrich
    const needRug = t.rug_score === null || justBonded || Math.random() < 0.34;
    if (needRug) {
      const rug = await fetchRug(t.mint);
      if (rug) {
        patch.rug_score = rug.score;
        patch.rug_risks = JSON.stringify(rug.risks);
        patch.lp_locked_pct = rug.lpLockedPct;
        patch.mint_auth = rug.mintAuth ? 1 : 0;
        patch.freeze_auth = rug.freezeAuth ? 1 : 0;
        patch.top10_pct = rug.top10Pct;
        patch.holders = rug.holders;
      }
      await sleep(400); // be polite to rugcheck
    }
    upsertToken(patch);
    const u = rescore(t.mint);
    if (!u) continue;
    if (justBonded) emitAlert(u, "BONDED", `Bonded to Raydium. Liquidity ${fmtUsd(u.liquidity_usd)}, LP locked ${u.lp_locked_pct ?? "?"}%. Tradeable via Jupiter now.`);
    if (u.score >= config.alertScoreMin) emitAlert(u, "SCORE_PASS", `Score ${u.score} ≥ ${config.alertScoreMin}. ${JSON.parse(u.score_reasons).slice(0, 4).join(" · ")}`);
    if (u.watch && t.trix_mcap && u.trix_mcap && u.trix_mcap >= t.trix_mcap * 2) emitAlert(u, "MCAP_2X", `Watched token doubled: ${fmtUsd(t.trix_mcap)} → ${fmtUsd(u.trix_mcap)}`, false);
  }
}

export async function runLoops(): Promise<void> {
  // stagger the two loops
  void (async () => { for (;;) { try { await scanOnce(); } catch (e) { console.error("scan error", (e as Error).message); } await sleep(config.scanIntervalSec * 1000); } })();
  await sleep(5000);
  void (async () => { for (;;) { try { await enrichOnce(); } catch (e) { console.error("enrich error", (e as Error).message); } await sleep(Math.max(15, config.enrichIntervalSec / 4) * 1000); } })();
}
