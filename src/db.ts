import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

export type Stage = "curve" | "bonded";

export interface TokenRow {
  mint: string;
  name: string;
  symbol: string;
  description: string | null;
  logo_url: string | null;
  created_at: string; // TRiX createdAt ISO
  creator_wallet: string | null;
  creator_username: string | null;
  creator_verified: number; // 0/1
  creator_points: number;
  creator_launches: number; // how many launches this creator has on TRiX
  creator_best_mcap: number; // best mcap among their other launches
  creator_dead_launches: number; // other launches below $2K mcap
  stage: Stage;
  boosted: number;
  coin_verified: number;
  trix_mcap: number | null;
  trix_vol24: number | null;
  trix_change24: number | null;
  creator_fee_claimed: number;
  pair_address: string | null;
  bonded_at: string | null;
  price_usd: number | null;
  liquidity_usd: number | null;
  vol24_usd: number | null;
  buys24: number | null;
  sells24: number | null;
  rug_score: number | null; // rugcheck normalised score (lower is better in their API; we store raw)
  rug_risks: string | null; // JSON array of risk names
  lp_locked_pct: number | null;
  mint_auth: number | null; // 1 = still present (bad)
  freeze_auth: number | null;
  top10_pct: number | null; // top-10 non-LP holders share
  holders: number | null;
  score: number;
  score_reasons: string; // JSON array of strings
  last_enriched_at: string | null;
  updated_at: string;
  watch: number; // user watchlist flag
}

export interface AlertRow {
  id: number;
  ts: string;
  mint: string;
  kind: string;
  title: string;
  body: string;
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tokens (
      mint TEXT PRIMARY KEY,
      name TEXT NOT NULL, symbol TEXT NOT NULL, description TEXT, logo_url TEXT,
      created_at TEXT NOT NULL,
      creator_wallet TEXT, creator_username TEXT, creator_verified INTEGER DEFAULT 0, creator_points REAL DEFAULT 0,
      creator_launches INTEGER DEFAULT 0, creator_best_mcap REAL DEFAULT 0, creator_dead_launches INTEGER DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'curve', boosted INTEGER DEFAULT 0, coin_verified INTEGER DEFAULT 0,
      trix_mcap REAL, trix_vol24 REAL, trix_change24 REAL, creator_fee_claimed REAL DEFAULT 0,
      pair_address TEXT, bonded_at TEXT, price_usd REAL, liquidity_usd REAL, vol24_usd REAL, buys24 INTEGER, sells24 INTEGER,
      rug_score REAL, rug_risks TEXT, lp_locked_pct REAL, mint_auth INTEGER, freeze_auth INTEGER, top10_pct REAL, holders INTEGER,
      score REAL DEFAULT 0, score_reasons TEXT DEFAULT '[]',
      last_enriched_at TEXT, updated_at TEXT NOT NULL, watch INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tokens_created ON tokens(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tokens_score ON tokens(score DESC);
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL, mint TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts DESC);
    CREATE TABLE IF NOT EXISTS snapshots (
      mint TEXT NOT NULL, ts TEXT NOT NULL, mcap REAL, price REAL, liq REAL, vol24 REAL, score REAL
    );
    CREATE INDEX IF NOT EXISTS idx_snap ON snapshots(mint, ts);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
  `);
  return db;
}

export function getToken(mint: string): TokenRow | undefined {
  return getDb().prepare("SELECT * FROM tokens WHERE mint = ?").get(mint) as TokenRow | undefined;
}

export function upsertToken(row: Partial<TokenRow> & { mint: string }): void {
  const d = getDb();
  const existing = getToken(row.mint);
  const merged: TokenRow = {
    ...(existing ?? {
      mint: row.mint, name: "", symbol: "", description: null, logo_url: null, created_at: new Date().toISOString(),
      creator_wallet: null, creator_username: null, creator_verified: 0, creator_points: 0,
      creator_launches: 0, creator_best_mcap: 0, creator_dead_launches: 0,
      stage: "curve", boosted: 0, coin_verified: 0, trix_mcap: null, trix_vol24: null, trix_change24: null, creator_fee_claimed: 0,
      pair_address: null, bonded_at: null, price_usd: null, liquidity_usd: null, vol24_usd: null, buys24: null, sells24: null,
      rug_score: null, rug_risks: null, lp_locked_pct: null, mint_auth: null, freeze_auth: null, top10_pct: null, holders: null,
      score: 0, score_reasons: "[]", last_enriched_at: null, updated_at: "", watch: 0,
    }),
    ...row,
    updated_at: new Date().toISOString(),
  };
  const cols = Object.keys(merged);
  d.prepare(
    `INSERT OR REPLACE INTO tokens (${cols.join(",")}) VALUES (${cols.map((c) => `@${c}`).join(",")})`,
  ).run(merged as unknown as Record<string, string | number | null>);
}

export function listTokens(opts: { limit?: number; minScore?: number; stage?: Stage; watchOnly?: boolean } = {}): TokenRow[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.minScore !== undefined) { where.push("score >= ?"); params.push(opts.minScore); }
  if (opts.stage) { where.push("stage = ?"); params.push(opts.stage); }
  if (opts.watchOnly) where.push("watch = 1");
  const sql = `SELECT * FROM tokens ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
  params.push(opts.limit ?? 200);
  return getDb().prepare(sql).all(...params) as unknown as TokenRow[];
}

export function tokensToEnrich(maxAgeHours: number, staleSec: number, limit = 25): TokenRow[] {
  const minCreated = new Date(Date.now() - maxAgeHours * 3600e3).toISOString();
  const staleBefore = new Date(Date.now() - staleSec * 1000).toISOString();
  return getDb()
    .prepare(
      `SELECT * FROM tokens WHERE (created_at >= ? OR watch = 1) AND (last_enriched_at IS NULL OR last_enriched_at < ?)
       ORDER BY last_enriched_at IS NULL DESC, created_at DESC LIMIT ?`,
    )
    .all(minCreated, staleBefore, limit) as unknown as TokenRow[];
}

export function addAlert(a: Omit<AlertRow, "id" | "ts">): AlertRow {
  const ts = new Date().toISOString();
  const r = getDb().prepare("INSERT INTO alerts (ts, mint, kind, title, body) VALUES (?,?,?,?,?)").run(ts, a.mint, a.kind, a.title, a.body);
  return { id: Number(r.lastInsertRowid), ts, ...a };
}

export function recentAlerts(limit = 100): AlertRow[] {
  return getDb().prepare("SELECT * FROM alerts ORDER BY id DESC LIMIT ?").all(limit) as unknown as AlertRow[];
}

export function hasAlert(mint: string, kind: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM alerts WHERE mint = ? AND kind = ? LIMIT 1").get(mint, kind);
}

export function addSnapshot(t: TokenRow): void {
  getDb()
    .prepare("INSERT INTO snapshots (mint, ts, mcap, price, liq, vol24, score) VALUES (?,?,?,?,?,?,?)")
    .run(t.mint, new Date().toISOString(), t.trix_mcap, t.price_usd, t.liquidity_usd, t.vol24_usd ?? t.trix_vol24, t.score);
}

export function snapshots(mint: string, limit = 200): { ts: string; mcap: number | null; price: number | null; score: number | null }[] {
  return getDb().prepare("SELECT ts, mcap, price, score FROM snapshots WHERE mint = ? ORDER BY ts DESC LIMIT ?").all(mint, limit).reverse() as never;
}

export function setWatch(mint: string, on: boolean): void {
  getDb().prepare("UPDATE tokens SET watch = ? WHERE mint = ?").run(on ? 1 : 0, mint);
}

export function kvGet(k: string): string | null {
  const r = getDb().prepare("SELECT v FROM kv WHERE k = ?").get(k) as { v: string } | undefined;
  return r?.v ?? null;
}
export function kvSet(k: string, v: string): void {
  getDb().prepare("INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)").run(k, v);
}
