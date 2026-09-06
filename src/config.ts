import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env loader (no dotenv dependency). Real env vars win over the file.
function loadDotEnv(): void {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const hash = val.indexOf(" #");
    if (hash >= 0) val = val.slice(0, hash).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const num = (k: string, d: number): number => {
  const v = process.env[k];
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (k: string, d = ""): string => process.env[k] ?? d;

const helius = str("HELIUS_API_KEY");
export const config = {
  rpcUrl: str("RPC_URL") || (helius ? `https://mainnet.helius-rpc.com/?api-key=${helius}` : "https://api.mainnet-beta.solana.com"),
  heliusApiKey: helius,
  scanIntervalSec: num("SCAN_INTERVAL_SEC", 30),
  enrichIntervalSec: num("ENRICH_INTERVAL_SEC", 120),
  trackMaxAgeHours: num("TRACK_MAX_AGE_HOURS", 72),
  alertScoreMin: num("ALERT_SCORE_MIN", 65),
  mcapMinUsd: num("MCAP_MIN_USD", 5000),
  mcapMaxUsd: num("MCAP_MAX_USD", 250000),
  liqMinUsd: num("LIQ_MIN_USD", 8000),
  port: num("PORT", 8787),
  alertWebhookUrl: str("ALERT_WEBHOOK_URL"),
  walletSecret: str("WALLET_SECRET"),
  jupiterBaseUrl: str("JUPITER_BASE_URL", "https://lite-api.jup.ag/swap/v1"),
  jupiterApiKey: str("JUPITER_API_KEY"),
  slippageBps: num("SLIPPAGE_BPS", 300),
  priorityFeeLamports: num("PRIORITY_FEE_LAMPORTS", 200000),
  dbPath: str("DB_PATH", "data/pond-scout.sqlite"),
  trixBase: "https://trix.market",
  dexscreenerBase: "https://api.dexscreener.com",
  rugcheckBase: "https://api.rugcheck.xyz/v1",
  wsol: "So11111111111111111111111111111111111111112",
} as const;
