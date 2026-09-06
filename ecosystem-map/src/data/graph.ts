import type { Edge, Node } from "@xyflow/react";

/** Territory a node belongs to. Drives accent color, legend and spotlight filtering. */
export type Category = "pond0x" | "trix" | "infra" | "scout" | "strategy" | "risk";

export interface CardData extends Record<string, unknown> {
  title: string;
  tag: string;
  caption: string;
  category: Category;
  icon: string;
  blurb: string;
  points: string[];
  link?: { label: string; url: string };
}

export interface ZoneData extends Record<string, unknown> {
  label: string;
  sub: string;
  category: Category;
  labelPos?: "top" | "bottom";
}

export const CATEGORY_META: Record<Category, { label: string; varName: string }> = {
  pond0x: { label: "Pond0x core", varName: "--c-pond0x" },
  trix: { label: "TRiX lifecycle", varName: "--c-trix" },
  infra: { label: "Solana rails", varName: "--c-infra" },
  scout: { label: "pond-scout", varName: "--c-scout" },
  strategy: { label: "Strategy", varName: "--c-strategy" },
  risk: { label: "Risk gates", varName: "--c-risk" },
};

const zone = (id: string, x: number, y: number, w: number, h: number, data: ZoneData): Node<ZoneData> => ({
  id,
  type: "zone",
  position: { x, y },
  data,
  width: w,
  height: h,
  selectable: false,
  draggable: false,
  focusable: false,
  zIndex: -10,
});

let order = 0;
const card = (id: string, x: number, y: number, data: CardData): Node<CardData> => ({
  id,
  type: "card",
  position: { x, y },
  data: { ...data, enterOrder: order++ },
  zIndex: 10,
});

export const initialNodes: Node[] = [
  // ------------------------------------------------------------- territories
  zone("z-pond0x", 40, 90, 430, 580, { label: "POND0X CORE", sub: "the ecosystem gravity well", category: "pond0x", labelPos: "bottom" }),
  zone("z-trix", 530, 90, 1030, 580, { label: "TRIX LAUNCHPAD", sub: "trix.market · launch lifecycle", category: "trix" }),
  zone("z-infra", 1620, 90, 530, 580, { label: "SOLANA RAILS", sub: "external infrastructure", category: "infra" }),
  zone("z-scout", 380, 760, 1230, 490, { label: "POND-SCOUT", sub: "this repo · scanner → score → act", category: "scout" }),
  zone("z-strategy", 1660, 760, 320, 900, { label: "PLAYBOOK", sub: "five strategies, one edge", category: "strategy" }),

  // ------------------------------------------------------------- pond0x core
  card("jimmy", 130, 170, {
    title: "Pond0x / Jimmy Edgar",
    tag: "ORIGIN",
    caption: "Artist-led crypto ecosystem; culture is the moat.",
    category: "pond0x",
    icon: "sparkles",
    blurb:
      "Pond0x is the ecosystem founded by electronic musician Jimmy Edgar. Its products (swap, mining, launchpad) share one audience — the Pond community — and one meta-strategy: attention compounds across everything the ecosystem ships.",
    points: [
      "Founder attention (a mention, a boost) is a real price catalyst inside the ecosystem",
      "TRiX is the ecosystem's launchpad — new tokens inherit the Pond audience on day one",
      "Culture-first: memes and mining rituals drive usage, not roadmaps",
    ],
    link: { label: "pond0x.com", url: "https://pond0x.com" },
  }),
  card("pndc", 110, 340, {
    title: "$PNDC · Pond Coin",
    tag: "TOKEN",
    caption: "The ecosystem's flagship token and loyalty flywheel.",
    category: "pond0x",
    icon: "coins",
    blurb:
      "Pond Coin is the flagship ecosystem token. Holding and using it inside Pond0x dApps is how the community keeps score — and the holder base is the distribution channel every TRiX launch taps into.",
    points: [
      "Flagship asset of the Pond0x ecosystem",
      "Its holder base = the initial buyer pool for ecosystem launches",
    ],
  }),
  card("mining", 170, 500, {
    title: "Swap & Mining — MINE HARDER",
    tag: "DAPP",
    caption: "Fee-generating swap + mining ritual that keeps the crowd engaged daily.",
    category: "pond0x",
    icon: "pickaxe",
    blurb:
      "The Pond0x swap and mining dApps give the community a daily ritual ('MINE HARDER'). That recurring engagement is the attention reservoir that TRiX launches drain into: an active crowd that is already on-chain, already primed to ape early.",
    points: [
      "Daily active ritual → persistent, reachable audience",
      "The MINE HARDER pattern names the play: position early in ecosystem assets before attention arrives",
    ],
  }),

  // ---------------------------------------------------------- trix lifecycle
  card("creator", 600, 170, {
    title: "Creator",
    tag: "ACTOR",
    caption: "TRiX profile: username, verification, points, launch history.",
    category: "trix",
    icon: "user",
    blurb:
      "Every launch belongs to a TRiX creator profile. Their track record is public: verification badge, TRiX points, and every previous launch — which makes reputation a scoreable signal.",
    points: [
      "Verified creator + 50K points = credibility signal (+ score)",
      "Serial dead launches (< $2K mcap after 24h) = strong negative signal",
      "pond-scout rebuilds full creator history from the TRiX catalogue hourly",
    ],
  }),
  card("launch", 890, 170, {
    title: "Token Launch",
    tag: "EVENT",
    caption: "New SPL mint appears on trix.market with metadata + curve.",
    category: "trix",
    icon: "rocket",
    blurb:
      "A launch mints the token and opens its bonding curve on trix.market. From this second the clock runs: freshness decays fast (< 1h is worth +15 score, < 3d only +4).",
    points: [
      "Discovered by polling /api/launches (unofficial API)",
      "NEW_LAUNCH alert fires once per mint",
      "Metadata: name, symbol, description, logo, creator, fees claimed",
    ],
    link: { label: "trix.market", url: "https://trix.market" },
  }),
  card("curve", 1190, 170, {
    title: "Bonding Curve",
    tag: "STAGE 1",
    caption: "Price discovery on TRiX's curve. Earliest possible entry.",
    category: "trix",
    icon: "trending-up",
    blurb:
      "On the curve, buys push price along a deterministic function. This is the earliest entry — and the least protected one: no external pool, no LP lock, exit only back through the curve on trix.market itself (embedded Privy wallet).",
    points: [
      "Not tradeable via Jupiter yet — buy on the TRiX page only",
      "TRiX mcap + 24h volume tracked via /api/prices/batch",
      "Curve tokens still get RugCheck'd for mint/freeze authority",
    ],
  }),
  card("attention", 750, 430, {
    title: "Attention Layer",
    tag: "SIGNAL",
    caption: "Paid boosts + coin verification = who the crowd is looking at.",
    category: "trix",
    icon: "megaphone",
    blurb:
      "TRiX sells visibility: active boosts (paid attention slots) and coin verification badges. Both are public API feeds — meaning attention itself is machine-readable before the chart reacts.",
    points: [
      "BOOSTED alert the moment a token buys a slot (+10 score)",
      "Coin verified: +5 score",
      "Attention precedes volume — that's the whole edge",
    ],
  }),
  card("bond", 1190, 430, {
    title: "Bond Event",
    tag: "STAGE 2 · CATALYST",
    caption: "Curve graduates → liquidity migrates to a Raydium pool.",
    category: "trix",
    icon: "zap",
    blurb:
      "Bonding is the single biggest catalyst in the lifecycle: the token becomes tradeable ecosystem-wide (Jupiter routing, DEX bots, screeners). TRiX's own poolAddress stays null even after bonding — so pond-scout detects the bond via DexScreener instead: the moment a SOL pair exists, stage flips to 'bonded'.",
    points: [
      "BONDED alert with liquidity + LP-lock readout",
      "< 3h after bond = catalyst window (+10 score)",
      "Never trust TRiX poolAddress for bond detection",
    ],
  }),

  // -------------------------------------------------------------- solana rails
  card("solana", 1650, 160, {
    title: "Solana",
    tag: "L1",
    caption: "The settlement layer everything here runs on.",
    category: "infra",
    icon: "layers",
    blurb:
      "All TRiX launches are SPL tokens on Solana mainnet. Fast blocks and cheap fees are what make a 30-second scan loop and sub-minute reaction times meaningful at all.",
    points: ["SPL token standard, ed25519 signatures", "Priority fees decide inclusion speed in hot moments"],
  }),
  card("raydium", 1900, 160, {
    title: "Raydium Pool",
    tag: "AMM",
    caption: "Destination of bonded liquidity; the 'real market' begins here.",
    category: "infra",
    icon: "waves",
    blurb:
      "When a token bonds, its liquidity seeds a Raydium AMM pool. Liquidity depth here decides whether a position can actually be exited — thin pools score negative in pond-scout.",
    points: ["LP lock % (via RugCheck) guards against pulls", "≥ $16K liquidity: +5 · below $8K: −8 score"],
  }),
  card("dexscreener", 1650, 330, {
    title: "DexScreener",
    tag: "DATA",
    caption: "Pair discovery, liquidity, buys/sells, volume.",
    category: "infra",
    icon: "radar",
    blurb:
      "DexScreener's public API is pond-scout's eyes on the open market: it detects the bond (a SOL pair exists), then supplies liquidity, 24h buy/sell counts and volume for flow scoring.",
    points: ["Bond detection source of truth", "Buy pressure ≥ 1.5× sells: +5 · sellers dominate: −5"],
  }),
  card("jupiter", 1900, 330, {
    title: "Jupiter",
    tag: "ROUTER",
    caption: "Swap aggregator — quotes, price impact, execution.",
    category: "infra",
    icon: "route",
    blurb:
      "Jupiter routes swaps across Solana AMMs. pond-scout uses it two ways: read-only quotes to preview price impact for your size, and the actual buy/sell execution path for the manual CLI.",
    points: ["Quote first, always: impact > 15% = position too big", "Swap tx built by Jupiter, signed locally, sent via RPC"],
  }),
  card("rugcheck", 1650, 500, {
    title: "RugCheck",
    tag: "SAFETY",
    caption: "Authorities, LP lock %, holder concentration, risk flags.",
    category: "infra",
    icon: "shield",
    blurb:
      "RugCheck audits the boring-but-fatal stuff: is mint authority still live (infinite supply risk), is freeze authority live (your tokens can be frozen), how much LP is locked, how concentrated are the top-10 holders.",
    points: ["Mint or freeze authority present → score = 0, no exceptions", "Top-10 ≥ 50% holdings: −12 (dump risk)"],
  }),
  card("helius", 1900, 500, {
    title: "Helius RPC",
    tag: "RPC",
    caption: "Balances, transaction send + confirm.",
    category: "infra",
    icon: "server",
    blurb:
      "Helius provides the RPC endpoint for wallet balance reads and raw transaction submission. Only signed bytes ever leave the machine — the key never does.",
    points: ["Used by the CLI only (trading path)", "Falls back to public mainnet RPC without an API key"],
  }),

  // ---------------------------------------------------------------- pond-scout
  card("scanner", 440, 850, {
    title: "Scan Loop",
    tag: "EVERY 30s",
    caption: "Polls TRiX: launches, boosts, verifications, prices.",
    category: "scout",
    icon: "scan",
    blurb:
      "The heartbeat. Every 30 seconds it pulls the newest 150 launches plus the attention feeds, upserts everything into SQLite, rescores, and emits alerts. First run seeds silently so 150 tokens don't spam you.",
    points: ["Creator history refreshed hourly from the full catalogue", "Emits NEW_LAUNCH, BOOSTED, SCORE_PASS"],
  }),
  card("enrich", 440, 1060, {
    title: "Enrich Loop",
    tag: "EVERY 120s",
    caption: "Refreshes DexScreener + RugCheck per tracked token.",
    category: "scout",
    icon: "refresh",
    blurb:
      "For every token younger than 72h (or watchlisted), it refreshes market structure from DexScreener and safety from RugCheck — throttled politely. This is where bonds are detected and BONDED fires.",
    points: ["Detects stage flip curve → bonded", "Emits BONDED and MCAP_2X (watchlist doubles)"],
  }),
  card("scoring", 740, 850, {
    title: "Scoring Engine",
    tag: "0 – 100",
    caption: "Every rule explicit, every reason in plain English.",
    category: "scout",
    icon: "gauge",
    blurb:
      "The judge. Weighs mcap window (≤25), freshness (≤15), stage (≤10), attention (≤15), creator reputation (±15), safety (±), and — for bonded tokens — liquidity and flow (≤10). Hard zeros for authorities and test tokens. The dashboard shows the full reason list for every score.",
    points: ["Alert threshold: score ≥ 65 → SCORE_PASS", "Reasons stored as JSON, rendered in the dashboard 'why' panel"],
  }),
  card("db", 740, 1060, {
    title: "SQLite Memory",
    tag: "node:sqlite · WAL",
    caption: "Tokens, alerts, snapshots, kv — zero dependencies.",
    category: "scout",
    icon: "database",
    blurb:
      "One WAL-mode SQLite file holds everything: token rows (the central TokenRow shape), the alert log (also used for dedup — one alert per mint per kind), and mcap/price/score snapshots for history charts.",
    points: ["Snapshots enable the MCAP_2X doubling check", "Alert table doubles as idempotency guard"],
  }),
  card("alerts", 1040, 850, {
    title: "Alert Bus",
    tag: "5 KINDS",
    caption: "NEW_LAUNCH · BONDED · BOOSTED · SCORE_PASS · MCAP_2X",
    category: "scout",
    icon: "bell",
    blurb:
      "An EventEmitter fanning out to three sinks: the console, the dashboard (SSE push + beep on the important ones), and an optional webhook in Discord/Slack-compatible shape for n8n or Telegram bridges.",
    points: ["SSE = zero-latency dashboard updates", "Webhook payload carries mint, score and deep links"],
  }),
  card("dashboard", 1330, 850, {
    title: "Live Dashboard",
    tag: "127.0.0.1:8787",
    caption: "Score, reasons, size-impact check, one-click links.",
    category: "scout",
    icon: "monitor",
    blurb:
      "A single-file, framework-free dashboard over plain node:http. It shows every tracked token with score + reasons, streams alerts live over SSE, runs a read-only Jupiter price-impact check for your size, and links out to TRiX / DexScreener / RugCheck.",
    points: ["The human decides here — the tool only argues its case", "Watchlist toggle feeds the MCAP_2X watcher"],
  }),
  card("wallet", 1040, 1060, {
    title: "Hot Wallet",
    tag: "ed25519 · LOCAL",
    caption: "Base58 key, signs Jupiter txs by hand. Never leaves disk.",
    category: "scout",
    icon: "key",
    blurb:
      "A dedicated, small hot wallet. Signing is done with Node's built-in ed25519 against Jupiter's serialized transaction — the byte layout is parsed manually (compact-u16, static keys) and only the signed bytes go to the RPC.",
    points: ["Phantom-format base58 secret, 32- or 64-byte", "Dedicated wallet, dust-sized balance — by design"],
  }),
  card("cli", 1330, 1060, {
    title: "Trading CLI",
    tag: "MANUAL ONLY",
    caption: "quote · buy · sell · wallet · score — with hard rails.",
    category: "scout",
    icon: "terminal",
    blurb:
      "Execution stays human-triggered. The CLI quotes first, refuses > 5 SOL per buy and > 15% price impact, then buys/sells through Jupiter. A confirmed buy auto-joins the watchlist so exit alerts arm themselves.",
    points: ["Slippage 3% default — thin memecoin pools need room", "sell <mint> <pct> exits a percentage, not all-or-nothing"],
  }),

  // ------------------------------------------------------------------ playbook
  card("s1", 1700, 830, {
    title: "Early Window Entry",
    tag: "PLAY 01",
    caption: "Fresh launch, $5K–$250K mcap, before the crowd.",
    category: "strategy",
    icon: "sunrise",
    blurb:
      "The core MINE HARDER pattern: take a small position in a fresh ecosystem launch while mcap sits inside the early window, betting that ecosystem attention finds it. Freshness and window position are the two biggest score components — deliberately.",
    points: ["Window: MCAP_MIN 5K → MCAP_MAX 250K (tunable)", "< 1h old is worth nearly a fifth of the max score", "Entry on-curve happens on trix.market itself"],
  }),
  card("s2", 1700, 1000, {
    title: "Bond Catalyst",
    tag: "PLAY 02",
    caption: "Buy the graduation — first 3h after Raydium listing.",
    category: "strategy",
    icon: "zap",
    blurb:
      "Bonding turns a closed curve into an open market: Jupiter routing, screener listings, bot flow. The play is entering just-bonded tokens with real liquidity, inside the catalyst window, before broader discovery.",
    points: ["BONDED alert = the starting gun", "Check liquidity ≥ $8K and LP lock before size", "Catalyst premium decays after ~3 hours"],
  }),
  card("s3", 1700, 1170, {
    title: "Safety Gate",
    tag: "PLAY 03 · VETO",
    caption: "Hard zeros: authorities, test tokens, dust caps.",
    category: "risk",
    icon: "shield-alert",
    blurb:
      "Not a scoring nudge — a veto. Live mint authority, live freeze authority, 'test / do not buy' names, and dust mcaps zero the score outright. Low LP lock and concentrated top-10 holders take heavy penalties. The scanner reduces obvious rugs; it does not make this safe.",
    points: ["Mint/freeze authority present → score 0", "LP < 50% locked: −15 · top-10 ≥ 50%: −12", "RugCheck flags (honeypot, copycat…) stack −6 each"],
  }),
  card("s4", 1700, 1340, {
    title: "Creator Reputation",
    tag: "PLAY 04",
    caption: "Back proven builders, fade serial rug launchers.",
    category: "strategy",
    icon: "fingerprint",
    blurb:
      "TRiX makes creator history public, so use it: verified creators with points and a previous $100K+ launch earn trust; wallets with a graveyard of dead launches get faded automatically.",
    points: ["Best other launch ≥ $100K: +5", "≥ 3 dead launches outnumbering alive ones: −10", "First-time creators: neutral — no history, no bonus"],
  }),
  card("s5", 1700, 1510, {
    title: "Exit Discipline",
    tag: "PLAY 05",
    caption: "Watchlist, doubling alerts, partial sells. Plan the exit first.",
    category: "strategy",
    icon: "log-out",
    blurb:
      "Positions join the watchlist on buy. MCAP_2X alerts flag doublings, percentage sells let you de-risk without closing, and the roadmap adds a positions table with take-profit / stop / trailing automation.",
    points: ["MCAP_2X fires on every watched doubling", "sell 50 = take initial off, let the rest ride", "Next step: automated exit loop (positions table)"],
  }),
];

const edge = (
  id: string,
  source: string,
  target: string,
  kind: "flow" | "trix" | "data" | "scout" | "strategy" | "risk",
  label?: string,
  animated = false,
  extra: Partial<Edge> = {},
): Edge => ({
  id,
  source,
  target,
  label,
  animated,
  className: `edge-${kind}`,
  ...extra,
});

/**
 * Pick source/target handle sides from node geometry so edges leave and enter
 * on the side that faces the other node (positions are static, so this is
 * computed once at module load).
 */
const CARD_W = 236;
const CARD_H = 118;
const centers = new Map<string, { x: number; y: number }>();
for (const n of initialNodes) {
  if (n.type === "card") centers.set(n.id, { x: n.position.x + CARD_W / 2, y: n.position.y + CARD_H / 2 });
}

function routed(e: Edge): Edge {
  const s = centers.get(e.source);
  const t = centers.get(e.target);
  if (!s || !t) return e;
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const horizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
  const sourceSide = horizontal ? (dx > 0 ? "r" : "l") : dy > 0 ? "b" : "t";
  const targetSide = horizontal ? (dx > 0 ? "l" : "r") : dy > 0 ? "t" : "b";
  return { ...e, sourceHandle: `s-${sourceSide}`, targetHandle: `t-${targetSide}` };
}

const rawEdges: Edge[] = [
  // pond0x internals → attention feeds the launchpad
  edge("e-jimmy-pndc", "jimmy", "pndc", "flow", "created"),
  edge("e-jimmy-mining", "jimmy", "mining", "flow", "operates"),
  edge("e-pndc-mining", "pndc", "mining", "flow"),
  edge("e-mining-attention", "mining", "attention", "flow", "MINE HARDER crowd", true),

  // trix lifecycle
  edge("e-creator-launch", "creator", "launch", "trix", "deploys", true),
  edge("e-launch-curve", "launch", "curve", "trix", "opens curve", true),
  edge("e-attention-curve", "attention", "curve", "trix", "drives buys"),
  edge("e-curve-bond", "curve", "bond", "trix", "graduates", true),
  edge("e-bond-raydium", "bond", "raydium", "trix", "LP migrates", true),

  // rails
  edge("e-solana-raydium", "solana", "raydium", "data"),
  edge("e-raydium-jupiter", "raydium", "jupiter", "data", "routes"),
  edge("e-raydium-dexscreener", "raydium", "dexscreener", "data", "pairs"),

  // data feeds into pond-scout
  edge("e-launch-scanner", "launch", "scanner", "data", "poll /api 30s"),
  edge("e-attention-scanner", "attention", "scanner", "data", "boosts · verify"),
  edge("e-dexscreener-enrich", "dexscreener", "enrich", "data", "bond detection"),
  edge("e-rugcheck-enrich", "rugcheck", "enrich", "data", "safety audit"),
  edge("e-helius-cli", "helius", "cli", "data", "send + confirm"),

  // pond-scout pipeline
  edge("e-scanner-scoring", "scanner", "scoring", "scout", "upsert + rescore", true),
  edge("e-enrich-scoring", "enrich", "scoring", "scout", "market + safety", true),
  edge("e-scanner-db", "scanner", "db", "scout"),
  edge("e-scoring-alerts", "scoring", "alerts", "scout", "SCORE_PASS ≥ 65", true),
  edge("e-alerts-dashboard", "alerts", "dashboard", "scout", "SSE", true),
  edge("e-db-dashboard", "db", "dashboard", "scout"),
  edge("e-wallet-cli", "wallet", "cli", "scout", "signs"),
  edge("e-cli-jupiter", "cli", "jupiter", "scout", "manual buy / sell", true),
  edge("e-dashboard-cli", "dashboard", "cli", "scout", "human decides"),

  // playbook overlays
  edge("e-s1-curve", "s1", "curve", "strategy", "enter early window"),
  edge("e-s2-bond", "s2", "bond", "strategy", "T+0…3h"),
  edge("e-s3-scoring", "s3", "scoring", "risk", "hard zeros"),
  edge("e-s3-rugcheck", "s3", "rugcheck", "risk"),
  edge("e-s4-creator", "s4", "creator", "strategy", "reputation filter"),
  edge("e-s5-alerts", "s5", "alerts", "strategy", "MCAP_2X"),
  edge("e-s5-cli", "s5", "cli", "strategy", "partial sells"),
];

export const initialEdges: Edge[] = rawEdges.map(routed);

/** Category an edge belongs to, for spotlight filtering. */
export const EDGE_CATEGORY: Record<string, Category> = {
  "edge-flow": "pond0x",
  "edge-trix": "trix",
  "edge-data": "infra",
  "edge-scout": "scout",
  "edge-strategy": "strategy",
  "edge-risk": "risk",
};
