#!/usr/bin/env node
/**
 * Manual trading CLI (you decide, it executes):
 *   npm run cli -- quote <mint> <sol>         price check + impact, no tx
 *   npm run cli -- buy   <mint> <sol>         buy with SOL via Jupiter (bonded tokens only)
 *   npm run cli -- sell  <mint> <pct>         sell pct% of your balance (e.g. 50)
 *   npm run cli -- wallet                     show hot-wallet address + SOL balance
 *   npm run cli -- score <mint>               fetch + score a single token right now
 */
import { config } from "./config.js";
import { buy, getQuote, sell } from "./trade/jupiter.js";
import { loadWallet } from "./trade/wallet.js";
import { getBalanceSol } from "./sources/rpc.js";
import { enrichOnce, scanOnce } from "./scanner.js";
import { getToken, setWatch } from "./db.js";
import { fmtUsd } from "./util.js";

const [cmd, a1, a2] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case "wallet": {
      const w = loadWallet();
      console.log("address:", w.publicKey);
      console.log("SOL    :", (await getBalanceSol(w.publicKey)).toFixed(4));
      return;
    }
    case "quote": {
      const sol = Number(a2);
      const q = await getQuote(config.wsol, a1, BigInt(Math.round(sol * 1e9)));
      console.log(`${sol} SOL -> ${q.outAmount} raw units | impact ${Number(q.priceImpactPct) * 100}% | route ${q.routePlan.map((r) => r.swapInfo.label).join(">")}`);
      return;
    }
    case "buy": {
      const sol = Number(a2);
      if (!a1 || !Number.isFinite(sol) || sol <= 0) throw new Error("usage: buy <mint> <sol>");
      if (sol > 5) throw new Error("refusing to buy > 5 SOL in one go (edit cli.ts if you really mean it)");
      const q = await getQuote(config.wsol, a1, BigInt(Math.round(sol * 1e9)));
      console.log(`quote: ${sol} SOL -> ${q.outAmount} | impact ${(Number(q.priceImpactPct) * 100).toFixed(2)}% | slippage ${config.slippageBps / 100}%`);
      if (Number(q.priceImpactPct) > 0.15) throw new Error("price impact > 15% — position too big for this pool. Lower size.");
      const r = await buy(a1, sol);
      console.log(`sent ${r.signature} -> ${r.status}  https://solscan.io/tx/${r.signature}`);
      if (r.status === "confirmed") setWatch(a1, true);
      return;
    }
    case "sell": {
      const pct = Number(a2);
      if (!a1 || !Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error("usage: sell <mint> <pct 1-100>");
      const r = await sell(a1, pct);
      console.log(`sent ${r.signature} -> ${r.status}  https://solscan.io/tx/${r.signature}`);
      return;
    }
    case "score": {
      await scanOnce();
      await enrichOnce();
      const t = getToken(a1);
      if (!t) throw new Error("token not in DB (not a TRiX launch, or older than the scan window)");
      console.log(`${t.name} ($${t.symbol}) stage=${t.stage} mcap=${fmtUsd(t.trix_mcap)} liq=${fmtUsd(t.liquidity_usd)} score=${t.score}`);
      for (const r of JSON.parse(t.score_reasons) as string[]) console.log("  ", r);
      return;
    }
    default:
      console.log("commands: wallet | quote <mint> <sol> | buy <mint> <sol> | sell <mint> <pct> | score <mint>");
  }
}

main().catch((e) => { console.error("error:", (e as Error).message); process.exit(1); });
