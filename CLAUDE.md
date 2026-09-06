# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Scanner, scoring engine and live alert dashboard for token launches on TRiX (trix.market, the Pond0x-ecosystem launchpad on Solana), plus a manual buy/sell CLI through Jupiter for tokens that have bonded to Raydium. The tool finds and judges launches; the human makes the buy decision (dashboard + CLI execute it).

**Zero runtime dependencies** — Node 22.13+ built-ins only (`node:sqlite`, `node:crypto` ed25519, `fetch`, `node:http`). Dev deps are just `typescript`, `tsx`, `@types/node`. Keep it that way: do not add runtime packages (no `@solana/web3.js`, no dotenv, no express). This rule applies to the scanner at the repo root only — `ecosystem-map/` is a separate Vite sub-app with its own dependencies.

## Commands

```bash
npm run dev          # scanner + dashboard on http://127.0.0.1:8787
npm run scan:once    # one scan + enrich pass, then exit
npm run selftest     # offline checks: base58, tx signing layout, scoring, sqlite (no network)
npm run typecheck    # tsc --noEmit
npm run build        # tsc -> dist/
npm run cli -- <cmd> # wallet | quote <mint> <sol> | buy <mint> <sol> | sell <mint> <pct> | score <mint>
```

There is no test framework; `src/selftest.ts` is the test suite (plain `node:assert`, runs offline, uses `DB_PATH=:memory:`). Add new checks there.

Config comes from `.env` (loaded by a minimal parser in `src/config.ts` — real env vars win). All knobs and defaults are in `.env.example`.

## Architecture

Entry point `src/index.ts`: opens the DB, starts the HTTP server, then runs two staggered infinite loops from `src/scanner.ts`:

1. **Scan loop** (every `SCAN_INTERVAL_SEC`, default 30s) — polls TRiX `/api/launches` + boosts + verifications + batch prices, upserts into sqlite, rescores, emits alerts. Creator history (launches/best mcap/dead launches per wallet) is built from the full TRiX catalogue at startup and refreshed hourly.
2. **Enrich loop** (per-token every `ENRICH_INTERVAL_SEC`, default 120s) — for tokens younger than `TRACK_MAX_AGE_HOURS` or watchlisted, refreshes DexScreener (bond detection, liquidity, buy/sell flow) and RugCheck (authorities, LP lock, holder concentration). RugCheck is throttled (400ms sleep, ~every 3rd enrich once known).

Data flow: `sources/*` fetch → `db.ts` upsert → `scoring.ts` rescore → `alerts.ts` emit → `server.ts` SSE push to dashboard.

- `src/db.ts` — `node:sqlite` (WAL) at `data/pond-scout.sqlite`. Tables: `tokens` (one row per mint, `TokenRow` is the central type), `alerts`, `snapshots` (mcap/price/score history), `kv`. `upsertToken` takes a partial row and merges with the existing row.
- `src/scoring.ts` — all scoring rules (0–100) with plain-English reasons stored as JSON in `score_reasons`. Hard zeros: mcap below `MCAP_MIN_USD`, test-token names, active mint/freeze authority. Every rule change shows up in the dashboard's "why" list.
- `src/alerts.ts` — `bus` EventEmitter + sqlite-backed dedup (`hasAlert`: one alert per mint per kind unless `once=false`). Console, SSE, and optional webhook (`ALERT_WEBHOOK_URL`, Discord/Slack-compatible payload).
- `src/server.ts` — plain `node:http`, binds 127.0.0.1 only. Serves `public/index.html` (single-file vanilla-JS dashboard), JSON API (`/api/tokens`, `/api/token/<mint>`, `/api/alerts`, `/api/quote`, `/api/watch`, `/api/config`), and SSE at `/events`.
- `src/trade/wallet.ts` — loads a base58 hot-wallet key and signs Jupiter's serialized transactions by hand: parses the compact-u16/message layout, finds our pubkey among required signers, drops the ed25519 signature in place. Byte-level Solana code — `selftest.ts` covers it; keep the test in sync with any change.
- `src/trade/jupiter.ts` — quote + swap build against the Jupiter Swap API, then send/confirm via `sources/rpc.ts` (raw JSON-RPC to Helius/mainnet).
- `src/cli.ts` — manual trading with safety rails: refuses >5 SOL per buy and >15% price impact. A confirmed buy auto-adds the mint to the watchlist.

## Domain gotchas

- TRiX endpoints (`src/sources/trix.ts`) are **unofficial**, reverse-engineered from the site's frontend; they may change without notice. Requests send `origin`/`referer` headers of trix.market.
- TRiX's `poolAddress` is `null` even for bonded tokens — **never** use it to detect bonding. Bonding is detected via DexScreener: a SOL pair exists → `stage` flips `"curve"` → `"bonded"` and fires the `BONDED` alert.
- Alert kinds: `NEW_LAUNCH`, `BONDED`, `BOOSTED`, `SCORE_PASS` (≥ `ALERT_SCORE_MIN`), `MCAP_2X` (watchlist only). First run seeds the catalogue silently (`first_scan_done` kv flag) so 150 tokens don't spam alerts.
- Tokens still on the TRiX bonding curve cannot be traded by the CLI (Jupiter only routes bonded/Raydium tokens); curve buys happen on trix.market itself.
- Amounts are handled in raw units as `bigint` (lamports, token raw amounts) — don't switch to floating point in trade paths.
- `WALLET_SECRET` is a real hot-wallet key. Never log, echo, or commit it; `.env` is git-ignored.

## ecosystem-map/ (separate sub-app)

An interactive ecosystem/strategy atlas built with Vite + React 19 + TypeScript + Tailwind v4 + React Flow (@xyflow/react). Run with `npm run dev` / build with `npm run build` **inside `ecosystem-map/`** (its own package.json and node_modules). Theming is pure CSS variables in `src/index.css` (`:root` light, `.dark` dark; React Flow's `--xy-*` vars are overridden there too). All diagram content — nodes, edges, zones, categories — lives in `src/data/graph.ts`; edge handle sides are auto-computed from node geometry at module load, so just position nodes and the edges route themselves.

## Planned extensions

README "Next steps" sketches where future automation hooks belong: auto-buy behind an `AUTO_BUY` flag at the `SCORE_PASS` emit site in `scanner.ts`; exit management via a `positions` table; pre-bond curve trading as `trade/trixCurve.ts`; Helius webhooks to beat polling.
