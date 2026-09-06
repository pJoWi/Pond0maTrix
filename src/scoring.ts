/**
 * Scores a TRiX launch 0–100 for the "early ecosystem position" play:
 * get in on a fresh, non-rug, community-backed token while mcap is still small,
 * ideally right around the bond to Raydium when attention (boost / Jimmy mention) can start.
 *
 * Every rule is explicit and tunable. Reasons are returned so the dashboard can show WHY.
 */
import { config } from "./config.js";
import type { TokenRow } from "./db.js";
import { minutesSince } from "./util.js";

export interface ScoreResult { score: number; reasons: string[] }

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function scoreToken(t: TokenRow): ScoreResult {
  const r: string[] = [];
  let s = 0;

  const mcap = t.trix_mcap ?? (t.price_usd !== null && t.price_usd !== undefined ? null : null);
  const age = minutesSince(t.created_at);

  // ---- Hard filters (score 0) ----
  if (mcap !== null && mcap < config.mcapMinUsd) return { score: 0, reasons: [`mcap ${Math.round(mcap)} < min ${config.mcapMinUsd} (dust/test)`] };
  if (/test|do not buy|dont buy/i.test(`${t.name} ${t.description ?? ""}`)) return { score: 0, reasons: ["looks like a test token"] };
  if (t.mint_auth === 1) return { score: 0, reasons: ["mint authority still active — can inflate supply"] };
  if (t.freeze_auth === 1) return { score: 0, reasons: ["freeze authority still active — can freeze your tokens"] };

  // ---- Market-cap window (max 25) ----
  if (mcap === null) { r.push("no mcap yet"); }
  else if (mcap <= config.mcapMaxUsd) {
    const inWindow = 25 - Math.round((mcap / config.mcapMaxUsd) * 10); // 25 at $0, 15 at max
    s += inWindow; r.push(`+${inWindow} mcap ${fmtK(mcap)} inside early window (≤ ${fmtK(config.mcapMaxUsd)})`);
  } else {
    r.push(`+0 mcap ${fmtK(mcap)} above window`);
  }

  // ---- Freshness (max 15) ----
  if (age < 60) { s += 15; r.push("+15 launched < 1h ago"); }
  else if (age < 6 * 60) { s += 12; r.push("+12 launched < 6h ago"); }
  else if (age < 24 * 60) { s += 8; r.push("+8 launched < 24h ago"); }
  else if (age < 72 * 60) { s += 4; r.push("+4 launched < 3d ago"); }
  else r.push("+0 older than 3 days");

  // ---- Stage (max 10): bonding is the catalyst moment ----
  if (t.stage === "bonded") {
    const sinceBond = minutesSince(t.bonded_at);
    if (sinceBond < 180) { s += 10; r.push("+10 bonded to Raydium < 3h ago (catalyst window)"); }
    else { s += 5; r.push("+5 bonded (tradeable via Jupiter)"); }
  } else {
    s += 4; r.push("+4 still on TRiX curve (earliest entry, buy on trix.market)");
  }

  // ---- Attention (max 15) ----
  if (t.boosted) { s += 10; r.push("+10 boosted on TRiX"); }
  if (t.coin_verified) { s += 5; r.push("+5 coin verified on TRiX"); }

  // ---- Creator reputation (max 15, can go negative) ----
  if (t.creator_verified) { s += 5; r.push("+5 verified creator"); }
  if (t.creator_points >= 50000) { s += 5; r.push(`+5 creator has ${Math.round(t.creator_points / 1000)}K TRiX points`); }
  else if (t.creator_points >= 10000) { s += 3; r.push("+3 creator has 10K+ TRiX points"); }
  if (t.creator_launches > 1) {
    const dead = t.creator_dead_launches;
    const alive = t.creator_launches - 1 - dead;
    if (t.creator_best_mcap >= 100000) { s += 5; r.push(`+5 creator's best other launch reached ${fmtK(t.creator_best_mcap)}`); }
    if (dead >= 3 && dead > alive) { s -= 10; r.push(`-10 serial launcher: ${dead} of ${t.creator_launches - 1} other launches are dead`); }
    else if (dead >= 1) { s -= 3; r.push(`-3 creator has ${dead} dead launch(es)`); }
  } else r.push("+0 first launch by this creator (no history)");

  // ---- Safety from RugCheck (max 10, penalties) ----
  if (t.lp_locked_pct !== null && t.lp_locked_pct !== undefined) {
    if (t.lp_locked_pct >= 95) { s += 8; r.push("+8 LP ≥95% locked"); }
    else if (t.lp_locked_pct >= 50) { s += 3; r.push(`+3 LP ${Math.round(t.lp_locked_pct)}% locked`); }
    else { s -= 15; r.push(`-15 LP only ${Math.round(t.lp_locked_pct)}% locked`); }
  }
  if (t.top10_pct !== null && t.top10_pct !== undefined) {
    if (t.top10_pct <= 25) { s += 2; r.push(`+2 top-10 holders own ${t.top10_pct.toFixed(0)}%`); }
    else if (t.top10_pct >= 50) { s -= 12; r.push(`-12 top-10 holders own ${t.top10_pct.toFixed(0)}% (dump risk)`); }
    else if (t.top10_pct >= 40) { s -= 5; r.push(`-5 top-10 holders own ${t.top10_pct.toFixed(0)}%`); }
  }
  const risks: string[] = safeJson(t.rug_risks);
  const bad = risks.filter((x) => /rug|honeypot|freeze|mint|copycat|low liquidity|single holder/i.test(x));
  if (bad.length) { s -= 6 * bad.length; r.push(`-${6 * bad.length} rugcheck: ${bad.join(", ")}`); }

  // ---- Liquidity & flow (bonded only, max 10) ----
  if (t.stage === "bonded") {
    const liq = t.liquidity_usd ?? 0;
    if (liq >= config.liqMinUsd * 2) { s += 5; r.push(`+5 liquidity ${fmtK(liq)}`); }
    else if (liq >= config.liqMinUsd) { s += 2; r.push(`+2 liquidity ${fmtK(liq)}`); }
    else { s -= 8; r.push(`-8 thin liquidity ${fmtK(liq)} — you can't exit a real position`); }
    const b = t.buys24 ?? 0, sl = t.sells24 ?? 0;
    if (b + sl >= 100) {
      const ratio = b / Math.max(1, sl);
      if (ratio >= 1.5) { s += 5; r.push(`+5 buy pressure ${b}/${sl}`); }
      else if (ratio < 0.8) { s -= 5; r.push(`-5 sellers dominate ${b}/${sl}`); }
      else r.push(`+0 balanced flow ${b}/${sl}`);
    } else r.push(`+0 low tx count (${b + sl}/24h)`);
    const vol = t.vol24_usd ?? 0;
    if (mcap && vol / mcap >= 0.3) { s += 3; r.push(`+3 volume/mcap ${(vol / mcap * 100).toFixed(0)}%`); }
  }

  // ---- Creator skimming fees hard is a yellow flag on tiny caps ----
  if (mcap && t.creator_fee_claimed > 0 && t.creator_fee_claimed * 150 > mcap * 0.05) {
    r.push(`⚠ creator already claimed ${t.creator_fee_claimed.toFixed(2)} SOL in fees`);
  }

  return { score: clamp(Math.round(s)), reasons: r };
}

function safeJson(s: string | null): string[] {
  try { return s ? (JSON.parse(s) as string[]) : []; } catch { return []; }
}
const fmtK = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`);
