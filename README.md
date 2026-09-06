# pond-scout

Scanner, scoring engine and live alert dashboard for launches on **TRiX** (trix.market, the Pond0x-ecosystem launchpad), plus a manual buy/sell CLI through Jupiter for tokens that have bonded to Raydium.

It automates the *finding* and *judging* part of the "early ecosystem position" play (the MINE HARDER pattern). The buy decision stays yours: the dashboard gives you the score, the reasons, a price-impact check for your size, and one-click links; the CLI executes the trade you chose.

Zero runtime dependencies — Node 22.13+ built-ins only (`node:sqlite`, `node:crypto` ed25519, `fetch`, `http`).

## Quick start

```bash
npm install                 # only typescript + tsx + @types/node
copy .env.example .env      # then fill in HELIUS_API_KEY (and later WALLET_SECRET)
npm run selftest            # offline checks: base58, tx signing, scoring, sqlite
npm run dev                 # starts scanner + dashboard on http://127.0.0.1:8787
```

First run loads the newest 150 TRiX launches silently (no alert spam); alerts begin on the next scan.

## What it watches

| Source | What we take from it |
|---|---|
| `trix.market/api/launches` | new launches, creator (username, verified, points), TRiX mcap, fees claimed |
| `trix.market/api/boosts/active`, `/api/coin-verifications` | paid boosts and verification badges (attention signals) |
| `trix.market/api/prices/batch` | 24h price/volume on the curve |
| DexScreener | **bond detection** (a SOL pair exists), liquidity, buys/sells, volume |
| RugCheck | mint/freeze authority, LP-lock %, top-10 holder concentration, risk flags |
| Helius RPC | balances and tx sending (CLI only) |

TRiX's `poolAddress` is `null` even for bonded tokens, so bonding is detected through DexScreener.

## Scoring (0–100)

All rules live in `src/scoring.ts` with plain-English reasons. Rough weights:

- market cap inside your early window (`MCAP_MAX_USD`) — up to 25
- freshness — up to 15
- stage: just bonded to Raydium (catalyst window) 10, on curve 4
- attention: boosted 10, coin verified 5
- creator reputation: verified, TRiX points, best previous launch, minus serial dead launches
- safety: LP lock, top-10 concentration, RugCheck flags; mint/freeze authority present → score 0
- bonded only: liquidity vs `LIQ_MIN_USD`, buy/sell pressure, volume/mcap

Test tokens and anything below `MCAP_MIN_USD` score 0.

## Alerts

`NEW_LAUNCH`, `BONDED`, `BOOSTED`, `SCORE_PASS` (≥ `ALERT_SCORE_MIN`), `MCAP_2X` (watchlist only). They appear in the dashboard (with a beep for SCORE_PASS/BONDED), in the console, and — if `ALERT_WEBHOOK_URL` is set — as a Discord/Slack-compatible JSON POST (works with n8n, Telegram bridges, etc.).

## Manual trading CLI (bonded tokens)

```bash
npm run cli -- wallet                 # hot-wallet address + SOL balance
npm run cli -- quote <mint> 0.25      # price impact for that size, no tx
npm run cli -- buy   <mint> 0.25      # buy 0.25 SOL worth via Jupiter; adds to watchlist
npm run cli -- sell  <mint> 50        # sell 50% of your balance
npm run cli -- score <mint>           # fetch + score one token now
```

Safety rails in `src/cli.ts`: refuses > 5 SOL per buy and > 15 % price impact. Slippage and priority fee are in `.env`.

Tokens still on the TRiX bonding curve are bought through the TRiX page itself (it uses an embedded Privy wallet). The dashboard links straight to `trix.market/coin/<mint>`.

### Wallet security

- `WALLET_SECRET` is the base58 secret key of a **dedicated hot wallet** holding only what you're willing to lose. Export one from Phantom/Solflare; never your main wallet.
- `.env` is git-ignored. The key never leaves your machine; signing is done locally with Node's ed25519 and only the signed transaction goes to your RPC.

## Layout

```
src/
  config.ts          .env loader + settings
  db.ts              sqlite schema (tokens, alerts, snapshots)
  scanner.ts         scan loop (TRiX) + enrich loop (DexScreener, RugCheck)
  scoring.ts         the rules
  alerts.ts          event bus, console, webhook
  server.ts          dashboard API + SSE
  cli.ts             manual trading
  sources/           trix.ts, dexscreener.ts, rugcheck.ts, rpc.ts
  trade/             wallet.ts (ed25519 signing), jupiter.ts (quote/swap)
public/index.html    dashboard
```

## Next steps (when you want more automation)

1. **Auto-buy with rules** — in `scanner.ts`, where `SCORE_PASS` is emitted, call `buy(mint, size)` behind a `AUTO_BUY=1` flag with a per-day SOL budget and a cooldown per creator.
2. **Exit management** — a `positions` table + a loop that sells on +X % / −Y % / trailing stop using `sell()`.
3. **Pre-bond execution** — reverse-engineer the TRiX curve program from a buy transaction (Solscan → program id + instruction layout) and add `trade/trixCurve.ts`.
4. **Helius webhooks** — subscribe to the TRiX launch program to catch new mints seconds earlier than polling.

## Disclaimer

Memecoins on 6-day-old launchpads are extremely high risk; the scanner reduces obvious rugs, it does not make this safe. Not financial advice.
