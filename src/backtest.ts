/**
 * Strategy backtest over the local snapshot history (research phase 1).
 *
 * Two modes, because the two candidate strategies live on different data:
 *
 *   --mode bond  (default) Bond catalyst: enter when a token bonds to Raydium
 *                with score >= MIN, using DexScreener PRICE snapshots. This is
 *                the tradeable strategy (Jupiter only routes bonded tokens).
 *   --mode curve Curve stage: enter on the first observation of a launch and
 *                use TRiX MARKET CAP as the price proxy. Not tradeable through
 *                the swapper (curve buys happen on trix.market), but it is the
 *                only way to measure whether the score ranks winners at all.
 *
 * Both share one exit policy: take half at 2x, trailing stop after a 1.5x
 * peak, hard stop, time stop. Fees model the real swapper round trip (4%).
 *
 * Pure simulation core (simulateTrade) is exported and covered by selftest.
 * Run against the live scanner DB (read-only):
 *
 *   DB_PATH=data/pond-scout.sqlite npm run backtest
 *   npm run backtest -- --mode curve --min-score 40
 *   npm run backtest -- --json
 */
import { DatabaseSync } from "node:sqlite";

export interface PricePoint {
  ts: string;
  price: number;
}

export interface BacktestParams {
  /** Total round-trip cost as a fraction (half applied on entry, half on exit). */
  feeRoundTrip: number;
  /** Sell half the position at this multiple of entry. */
  takeHalfAt: number;
  /** Trailing stop arms once peak >= trailArm * entry... */
  trailArm: number;
  /** ...and fires when price falls this fraction below the peak. */
  trailDrop: number;
  /** Hard stop: exit everything when price falls this fraction below entry. */
  hardStopDrop: number;
  /** Time stop: exit whatever is left after this many hours. */
  maxHoldHours: number;
}

export const DEFAULT_PARAMS: BacktestParams = {
  feeRoundTrip: 0.04,
  takeHalfAt: 2,
  trailArm: 1.5,
  trailDrop: 0.25,
  hardStopDrop: 0.7,
  maxHoldHours: 48,
};

export interface TradeExit {
  ts: string;
  price: number;
  fraction: number;
  reason: "take-half" | "trailing-stop" | "hard-stop" | "time-stop" | "end-of-data";
}

export interface TradeResult {
  entryTs: string;
  entryPrice: number;
  exits: TradeExit[];
  /** Net return on 1 unit staked, after fees; -0.42 = lost 42%. */
  roi: number;
  closed: boolean;
  holdHours: number;
  peakMultiple: number;
}

const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3_600_000;

/**
 * Simulate one position over its price path. points[0] is the entry candle;
 * returns null when there is nothing to trade on.
 */
export function simulateTrade(points: PricePoint[], params: BacktestParams): TradeResult | null {
  if (points.length === 0 || !(points[0].price > 0)) return null;
  const feeSide = params.feeRoundTrip / 2;
  const entry = points[0];
  // Stake 1 quote unit; entry fee shrinks what we actually hold.
  const tokens = (1 - feeSide) / entry.price;

  let held = 1; // fraction of tokens still held
  let proceeds = 0;
  let tookHalf = false;
  let peak = entry.price;
  const exits: TradeExit[] = [];

  const sell = (fraction: number, point: PricePoint, reason: TradeExit["reason"]) => {
    const f = Math.min(fraction, held);
    if (f <= 0) return;
    proceeds += f * tokens * point.price * (1 - feeSide);
    held -= f;
    exits.push({ ts: point.ts, price: point.price, fraction: f, reason });
  };

  let last = entry;
  for (const point of points) {
    if (!(point.price > 0)) continue;
    last = point;
    if (point.price > peak) peak = point.price;
    const multiple = point.price / entry.price;

    if (point !== entry) {
      // Hard stop dominates: a crashed position exits regardless of history.
      if (multiple <= 1 - params.hardStopDrop) {
        sell(1, point, "hard-stop");
        break;
      }
      if (!tookHalf && multiple >= params.takeHalfAt) {
        tookHalf = true;
        sell(0.5, point, "take-half");
      }
      if (held > 0 && peak >= params.trailArm * entry.price && point.price <= (1 - params.trailDrop) * peak) {
        sell(1, point, "trailing-stop");
        break;
      }
      if (held > 0 && hoursBetween(entry.ts, point.ts) >= params.maxHoldHours) {
        sell(1, point, "time-stop");
        break;
      }
    }
  }

  const closed = held <= 1e-9;
  // Open remainder is marked to the last observed price (still pays the exit fee).
  const markValue = closed ? 0 : held * tokens * last.price * (1 - feeSide);
  if (!closed) exits.push({ ts: last.ts, price: last.price, fraction: held, reason: "end-of-data" });

  return {
    entryTs: entry.ts,
    entryPrice: entry.price,
    exits,
    roi: proceeds + markValue - 1,
    closed,
    holdHours: hoursBetween(entry.ts, exits[exits.length - 1]?.ts ?? entry.ts),
    peakMultiple: peak / entry.price,
  };
}

/* ------------------------------------------------------------------ I/O */

interface CandidateRow {
  mint: string;
  symbol: string;
  bonded_at: string;
  score: number;
}

interface SnapRow {
  ts: string;
  price: number | null;
  score: number | null;
  liq: number | null;
}

interface Args {
  mode: "bond" | "curve";
  minScore: number;
  liqMin: number;
  fee: number;
  maxEntryLagH: number;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, dflt: number) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : dflt;
  };
  const modeIdx = argv.indexOf("--mode");
  const mode = modeIdx >= 0 && argv[modeIdx + 1] === "curve" ? "curve" : "bond";
  return {
    mode,
    minScore: get("--min-score", mode === "curve" ? 40 : 65),
    liqMin: get("--liq-min", mode === "curve" ? 0 : 8_000),
    fee: get("--fee", DEFAULT_PARAMS.feeRoundTrip),
    maxEntryLagH: get("--max-entry-lag-h", 2),
    json: argv.includes("--json"),
  };
}

function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export function runBacktest(dbPath: string, args: Args): void {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const params: BacktestParams = { ...DEFAULT_PARAMS, feeRoundTrip: args.fee };

  const candidates =
    args.mode === "bond"
      ? (db
          .prepare("SELECT mint, symbol, bonded_at, score FROM tokens WHERE bonded_at IS NOT NULL ORDER BY bonded_at")
          .all() as unknown as CandidateRow[])
      : // Curve mode: every launch is a candidate, "bonded_at" stands in as the
        // reference time (creation), and mcap plays the role of price.
        (db
          .prepare("SELECT mint, symbol, created_at AS bonded_at, score FROM tokens ORDER BY created_at")
          .all() as unknown as CandidateRow[]);

  const snapStmt = db.prepare(
    args.mode === "bond"
      ? "SELECT ts, price, score, liq FROM snapshots WHERE mint = ? AND ts >= ? ORDER BY ts"
      : "SELECT ts, mcap AS price, score, liq FROM snapshots WHERE mint = ? AND ts >= ? ORDER BY ts",
  );

  interface Row {
    mint: string;
    symbol: string;
    entryScore: number;
    result: TradeResult;
  }
  const trades: Row[] = [];
  let skippedScore = 0;
  let skippedLiq = 0;
  let skippedStale = 0;
  let skippedNoData = 0;

  for (const c of candidates) {
    const snaps = snapStmt.all(c.mint, c.bonded_at) as unknown as SnapRow[];
    const priced = snaps.filter((s): s is SnapRow & { price: number } => s.price !== null && s.price > 0);
    if (priced.length < 2) {
      skippedNoData++;
      continue;
    }
    const entry = priced[0];
    // Only take entries we could actually have made: in bond mode the first
    // priced snapshot must sit close to the bond, otherwise the event predates
    // our monitoring. Curve mode enters at first sight, whatever the age.
    if (args.mode === "bond" && hoursBetween(c.bonded_at, entry.ts) > args.maxEntryLagH) {
      skippedStale++;
      continue;
    }
    const entryScore = entry.score ?? c.score;
    if (entryScore < args.minScore) {
      skippedScore++;
      continue;
    }
    if (entry.liq !== null && entry.liq < args.liqMin) {
      skippedLiq++;
      continue;
    }
    const result = simulateTrade(
      priced.map((s) => ({ ts: s.ts, price: s.price })),
      params,
    );
    if (result) trades.push({ mint: c.mint, symbol: c.symbol, entryScore, result });
  }

  const rois = trades.map((t) => t.result.roi);
  const wins = rois.filter((r) => r > 0).length;
  const sum = rois.reduce((a, b) => a + b, 0);
  const sorted = [...rois].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const summary = {
    dbPath,
    params: { ...params, minScore: args.minScore, liqMin: args.liqMin, maxEntryLagH: args.maxEntryLagH },
    candidatesBonded: candidates.length,
    skipped: { belowScore: skippedScore, belowLiq: skippedLiq, bondPredatesData: skippedStale, noPriceData: skippedNoData },
    trades: trades.length,
    winRate: trades.length ? wins / trades.length : 0,
    avgRoi: trades.length ? sum / trades.length : 0,
    medianRoi: median,
    totalRoi: sum,
    openPositions: trades.filter((t) => !t.result.closed).length,
  };

  // Does the score rank-order outcomes? Compare buckets on the SAME entries,
  // ignoring the score gate (that is the question the gate depends on).
  const scoreBuckets = (() => {
    const all = trades.map((t) => ({ score: t.entryScore, peak: t.result.peakMultiple, roi: t.result.roi }));
    const buckets: { label: string; min: number; max: number }[] = [
      { label: "score 0", min: -1, max: 0 },
      { label: "score 1-39", min: 1, max: 39 },
      { label: "score 40-49", min: 40, max: 49 },
      { label: "score 50+", min: 50, max: 1000 },
    ];
    return buckets.map((b) => {
      const rows = all.filter((r) => r.score >= b.min && r.score <= b.max);
      const peaks = rows.map((r) => r.peak).sort((x, y) => x - y);
      return {
        label: b.label,
        n: rows.length,
        medianPeak: peaks.length ? peaks[Math.floor(peaks.length / 2)] : 0,
        bestPeak: peaks.length ? peaks[peaks.length - 1] : 0,
        pctAbove1_5x: rows.length ? rows.filter((r) => r.peak >= 1.5).length / rows.length : 0,
        avgRoi: rows.length ? rows.reduce((a, r) => a + r.roi, 0) / rows.length : 0,
      };
    });
  })();

  if (args.json) {
    console.log(JSON.stringify({ summary, scoreBuckets, trades }, null, 2));
    return;
  }

  console.log(
    `\n${args.mode === "bond" ? "Bond-catalyst" : "Curve-stage (mcap proxy, NOT swapper-tradeable)"} backtest — ${dbPath}`,
  );
  console.log(
    `params: minScore=${args.minScore} liqMin=$${args.liqMin} fee=${(params.feeRoundTrip * 100).toFixed(1)}% ` +
      `takeHalf@${params.takeHalfAt}x trail=${params.trailArm}x/-${params.trailDrop * 100}% ` +
      `hardStop=-${params.hardStopDrop * 100}% timeStop=${params.maxHoldHours}h\n`,
  );
  console.log(
    `bonded candidates: ${candidates.length} · entered: ${trades.length} · skipped: ` +
      `${skippedScore} score, ${skippedLiq} liq, ${skippedStale} bond-predates-data, ${skippedNoData} no-data\n`,
  );

  // Long tables help nobody; show the extremes.
  const ranked = [...trades].sort((a, b) => b.result.roi - a.result.roi);
  const show = ranked.length <= 20 ? ranked : [...ranked.slice(0, 10), ...ranked.slice(-5)];
  for (const t of show) {
    const r = t.result;
    const exitStr = r.exits.map((e) => `${e.reason}@${(e.price / r.entryPrice).toFixed(2)}x`).join(" → ");
    console.log(
      `${pct(r.roi).padStart(8)}  ${t.symbol.padEnd(12)} score ${String(t.entryScore).padStart(3)}  ` +
        `peak ${r.peakMultiple.toFixed(2)}x  hold ${r.holdHours.toFixed(1)}h  ${exitStr}${r.closed ? "" : " (open)"}`,
    );
  }
  if (ranked.length > show.length) console.log(`  … ${ranked.length - show.length} more between the extremes`);

  if (trades.length >= 8) {
    console.log("\nDoes the score rank outcomes? (same entries, gate ignored)");
    for (const b of scoreBuckets) {
      if (b.n === 0) continue;
      console.log(
        `  ${b.label.padEnd(11)} n=${String(b.n).padStart(3)}  median peak ${b.medianPeak.toFixed(2)}x  ` +
          `best ${b.bestPeak.toFixed(2)}x  ≥1.5x: ${(b.pctAbove1_5x * 100).toFixed(0)}%  avg ROI ${pct(b.avgRoi)}`,
      );
    }
  }

  console.log(`\ntrades: ${summary.trades}  win rate: ${(summary.winRate * 100).toFixed(0)}%`);
  console.log(`avg ROI: ${pct(summary.avgRoi)}  median: ${pct(summary.medianRoi)}  total (1 unit/trade): ${pct(summary.totalRoi)}`);
  if (summary.openPositions > 0) console.log(`open (marked to last price): ${summary.openPositions}`);
  console.log(
    summary.trades === 0
      ? "\nNo qualifying trades yet — let the scanner run longer or relax --min-score to probe."
      : summary.avgRoi > 0
        ? "\nExpectancy positive after fees at these settings — phase-2 paper trading is worth running."
        : "\nExpectancy NEGATIVE after fees at these settings — tune gates before any live automation.",
  );
}

// CLI entry — keep import side-effect free for selftest.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("/backtest.ts")) {
  const dbPath = process.env.DB_PATH || "data/pond-scout.sqlite";
  runBacktest(dbPath, parseArgs(process.argv.slice(2)));
}
