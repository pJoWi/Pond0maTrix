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
  zone("z-pond0x", 40, 90, 740, 700, { label: "POND0X CORE", sub: "cross-chain activity engine · everything flows back here", category: "pond0x", labelPos: "bottom" }),
  zone("z-trix", 840, 90, 1030, 580, { label: "TRIX LAUNCHPAD", sub: "trix.market · launch lifecycle", category: "trix" }),
  zone("z-infra", 1930, 90, 530, 580, { label: "SOLANA RAILS", sub: "external infrastructure", category: "infra" }),
  zone("z-scout", 380, 860, 1230, 490, { label: "POND-SCOUT", sub: "this repo · scanner → score → act", category: "scout" }),
  zone("z-strategy", 1660, 860, 320, 900, { label: "PLAYBOOK", sub: "five strategies, one edge", category: "strategy" }),

  // ------------------------------------------------------------- pond0x core
  card("pond0x", 100, 160, {
    title: "Pond0x — PondD🤝X",
    tag: "ORIGIN",
    caption: "Cross-chain activity engine by Hwonder & Pauly0x; culture is the moat.",
    category: "pond0x",
    icon: "sparkles",
    blurb:
      "Pond0x (PondD🤝X) is the gravity well of this map: check in, mine in-browser, swap, lock water, spawn, bid in auctions — one paired account settling on Ethereum + Solana. The operator of record in the Terms is Pond Issuer Limited (BVI), and every reward is explicitly discretionary. TRiX, Jimmy Edgar's launchpad, plugs into this audience — and every flow on this map eventually cycles back here.",
    points: [
      "Products: Check-in · Mine · Swap · Water · Spawn · Auction",
      "Settlement on Ethereum + Solana, one paired account",
      "Rewards are discretionary, never promised (Terms: Pond Issuer Limited, BVI)",
      "Sources: pond0x.com FAQs · docs.pond0x.com/terms · Dune 'Pond D🤝X' · Cary0x notes (unofficial)",
    ],
    link: { label: "pond0x.com", url: "https://pond0x.com" },
  }),
  card("checkin", 430, 160, {
    title: "Check-in",
    tag: "ACCOUNT",
    caption: "Pairs Ethereum + Solana wallets (and X) into one Pond account.",
    category: "pond0x",
    icon: "user-check",
    blurb:
      "Everything starts with a check-in: it pairs wallets across Ethereum and Solana (plus your X handle) into a single Pond identity, so mining boosts, swap rewards, locks and spawns all accrue to one account across both settlement chains.",
    points: [
      "The entry gate for mining, spawning and rewards",
      "Teleport migrates legacy Ethereum badges into the paired account",
      "One identity, two chains — the cross-chain glue of the engine",
    ],
  }),
  card("swap", 100, 315, {
    title: "Swap — Pond D🤝X",
    tag: "DEX",
    caption: "'GigaSwap': aggregated swaps on ETH + SOL; fees feed the reward pool.",
    category: "pond0x",
    icon: "arrow-left-right",
    blurb:
      "The Pond DEX (community nickname: GigaSwap) aggregates liquidity across DEXes, bridges and chains on both Ethereum and Solana. A ~1% swap fee flows to the reward safe, and swap rewards stream back to active swappers weighted by frequency, volume and tokens — at the operator's discretion.",
    points: [
      "Referral links (Friends) share swap rewards",
      "Volume and fees are public on the Dune 'Pond D🤝X' dashboard",
      "Rewards are discretionary — there is no promised APR",
    ],
    link: { label: "Dune: Pond D🤝X", url: "https://dune.com/mogie/pond-dex" },
  }),
  card("water", 430, 315, {
    title: "Pondwater — $wPOND Lock",
    tag: "LOCK",
    caption: "Lock $wPOND for a term → pondSOL stream + mining boost.",
    category: "pond0x",
    icon: "droplets",
    blurb:
      "Water locks $wPOND for a chosen period in exchange for a stream of pondSOL while the lock is active. Every active lock also boosts your miner — unlock and the boost disappears; when the term expires, the stream stops. Locks are public on the PondWater Explorer.",
    points: [
      "Longer locks → stronger stream terms",
      "Each active lock raises your mining boost",
      "Stream ends at expiry; early unlock drops the boost",
    ],
    link: { label: "pondwater.pond0x.com", url: "https://pondwater.pond0x.com" },
  }),
  card("tokens", 100, 470, {
    title: "$PNDC · $wPOND · pondSOL",
    tag: "TOKENS",
    caption: "Flagship on Ethereum, workhorse on Solana, stream from locks.",
    category: "pond0x",
    icon: "coins",
    blurb:
      "$PNDC (Pond Coin) is the flagship ERC-20 on Ethereum. $wPOND is the Solana workhorse: mined in-browser, locked in Water, spent inside the flywheel. pondSOL is what active water locks stream. Together their holder base is the distribution channel every ecosystem launch — TRiX included — taps first.",
    points: [
      "$PNDC: flagship token, Ethereum ERC-20",
      "$wPOND: mined + locked on Solana",
      "pondSOL: streamed by active Water locks",
    ],
  }),
  card("mining", 430, 470, {
    title: "Mining — MINE HARDER",
    tag: "DAPP",
    caption: "In-browser miner: solve + validate hashes, earn $wPOND.",
    category: "pond0x",
    icon: "pickaxe",
    blurb:
      "The daily ritual. The in-browser miner solves and validates hashes and pays out $wPOND. Boosts stack from Water locks, PRO status and Auction hashpower — and mining claims are what trigger Spawn events. The MINE HARDER crowd is the attention reservoir TRiX launches drain into.",
    points: [
      "Earns $wPOND; claims can trigger Spawns",
      "Boosted by Water locks, PRO and Auctions",
      "Daily active ritual → persistent, reachable audience",
    ],
  }),
  card("spawn", 100, 625, {
    title: "Spawn",
    tag: "EVENT",
    caption: "Mining claims trigger spawns that mint you an ecosystem token.",
    category: "pond0x",
    icon: "egg",
    blurb:
      "Spawns convert mining activity into other pond tokens: time-limited events, triggered by mining claims, that pay out whichever eligible token has the highest supply at spawn time — you don't pick. Rank burns let the crowd influence upcoming spawns.",
    points: [
      "Triggered by mining claims, deployed on Solana",
      "Payout = the highest-supply eligible token at spawn time",
      "Activity → tokens → back into the pond",
    ],
  }),
  card("auction", 430, 625, {
    title: "Auction",
    tag: "HASHPOWER",
    caption: "Rent the pond's collective hashpower to boost a token.",
    category: "pond0x",
    icon: "gavel",
    blurb:
      "Auctions rent out the community's collective processing power: bidders point the pond's mining at a specific token to boost it, while miners keep earning rewards. Paid attention as a native primitive — the same mechanic TRiX boosts sell, one level deeper.",
    points: [
      "Bid hashpower toward a token of choice",
      "Participants keep earning mining rewards",
      "Attention is a market inside the pond too",
    ],
  }),

  // ---------------------------------------------------------- trix lifecycle
  card("jimmy", 855, 430, {
    title: "Jimmy Edgar — void.solutions",
    tag: "BUILDER",
    caption: "Electronic musician; creator of void.solutions and trix.market.",
    category: "trix",
    icon: "wand",
    blurb:
      "Jimmy Edgar is the electronic musician and artist behind void.solutions and the TRiX launchpad (trix.market). He builds and operates the platform the whole lifecycle on this map runs on — and his attention is itself a catalyst for tokens launched there.",
    points: [
      "Creator of trix.market, the launchpad in the Pond0x ecosystem",
      "void.solutions is his creative/tech studio",
      "A Jimmy mention can start the attention flywheel for a launch",
    ],
    link: { label: "void.solutions", url: "https://void.solutions" },
  }),
  card("creator", 910, 170, {
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
  card("launch", 1200, 170, {
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
  card("curve", 1500, 170, {
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
  card("attention", 1140, 430, {
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
  card("bond", 1500, 430, {
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
  card("solana", 1960, 160, {
    title: "Solana",
    tag: "L1",
    caption: "The settlement layer everything here runs on.",
    category: "infra",
    icon: "layers",
    blurb:
      "All TRiX launches are SPL tokens on Solana mainnet. Fast blocks and cheap fees are what make a 30-second scan loop and sub-minute reaction times meaningful at all.",
    points: ["SPL token standard, ed25519 signatures", "Priority fees decide inclusion speed in hot moments"],
  }),
  card("raydium", 2210, 160, {
    title: "Raydium Pool",
    tag: "AMM",
    caption: "Destination of bonded liquidity; the 'real market' begins here.",
    category: "infra",
    icon: "waves",
    blurb:
      "When a token bonds, its liquidity seeds a Raydium AMM pool. Liquidity depth here decides whether a position can actually be exited — thin pools score negative in pond-scout.",
    points: ["LP lock % (via RugCheck) guards against pulls", "≥ $16K liquidity: +5 · below $8K: −8 score"],
  }),
  card("dexscreener", 1960, 330, {
    title: "DexScreener",
    tag: "DATA",
    caption: "Pair discovery, liquidity, buys/sells, volume.",
    category: "infra",
    icon: "radar",
    blurb:
      "DexScreener's public API is pond-scout's eyes on the open market: it detects the bond (a SOL pair exists), then supplies liquidity, 24h buy/sell counts and volume for flow scoring.",
    points: ["Bond detection source of truth", "Buy pressure ≥ 1.5× sells: +5 · sellers dominate: −5"],
  }),
  card("jupiter", 2210, 330, {
    title: "Jupiter",
    tag: "ROUTER",
    caption: "Swap aggregator — quotes, price impact, execution.",
    category: "infra",
    icon: "route",
    blurb:
      "Jupiter routes swaps across Solana AMMs. pond-scout uses it two ways: read-only quotes to preview price impact for your size, and the actual buy/sell execution path for the manual CLI.",
    points: ["Quote first, always: impact > 15% = position too big", "Swap tx built by Jupiter, signed locally, sent via RPC"],
  }),
  card("rugcheck", 1960, 500, {
    title: "RugCheck",
    tag: "SAFETY",
    caption: "Authorities, LP lock %, holder concentration, risk flags.",
    category: "infra",
    icon: "shield",
    blurb:
      "RugCheck audits the boring-but-fatal stuff: is mint authority still live (infinite supply risk), is freeze authority live (your tokens can be frozen), how much LP is locked, how concentrated are the top-10 holders.",
    points: ["Mint or freeze authority present → score = 0, no exceptions", "Top-10 ≥ 50% holdings: −12 (dump risk)"],
  }),
  card("helius", 2210, 500, {
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
  card("scanner", 440, 950, {
    title: "Scan Loop",
    tag: "EVERY 30s",
    caption: "Polls TRiX: launches, boosts, verifications, prices.",
    category: "scout",
    icon: "scan",
    blurb:
      "The heartbeat. Every 30 seconds it pulls the newest 150 launches plus the attention feeds, upserts everything into SQLite, rescores, and emits alerts. First run seeds silently so 150 tokens don't spam you.",
    points: ["Creator history refreshed hourly from the full catalogue", "Emits NEW_LAUNCH, BOOSTED, SCORE_PASS"],
  }),
  card("enrich", 440, 1160, {
    title: "Enrich Loop",
    tag: "EVERY 120s",
    caption: "Refreshes DexScreener + RugCheck per tracked token.",
    category: "scout",
    icon: "refresh",
    blurb:
      "For every token younger than 72h (or watchlisted), it refreshes market structure from DexScreener and safety from RugCheck — throttled politely. This is where bonds are detected and BONDED fires.",
    points: ["Detects stage flip curve → bonded", "Emits BONDED and MCAP_2X (watchlist doubles)"],
  }),
  card("scoring", 740, 950, {
    title: "Scoring Engine",
    tag: "0 – 100",
    caption: "Every rule explicit, every reason in plain English.",
    category: "scout",
    icon: "gauge",
    blurb:
      "The judge. Weighs mcap window (≤25), freshness (≤15), stage (≤10), attention (≤15), creator reputation (±15), safety (±), and — for bonded tokens — liquidity and flow (≤10). Hard zeros for authorities and test tokens. The dashboard shows the full reason list for every score.",
    points: ["Alert threshold: score ≥ 65 → SCORE_PASS", "Reasons stored as JSON, rendered in the dashboard 'why' panel"],
  }),
  card("db", 740, 1160, {
    title: "SQLite Memory",
    tag: "node:sqlite · WAL",
    caption: "Tokens, alerts, snapshots, kv — zero dependencies.",
    category: "scout",
    icon: "database",
    blurb:
      "One WAL-mode SQLite file holds everything: token rows (the central TokenRow shape), the alert log (also used for dedup — one alert per mint per kind), and mcap/price/score snapshots for history charts.",
    points: ["Snapshots enable the MCAP_2X doubling check", "Alert table doubles as idempotency guard"],
  }),
  card("alerts", 1040, 950, {
    title: "Alert Bus",
    tag: "5 KINDS",
    caption: "NEW_LAUNCH · BONDED · BOOSTED · SCORE_PASS · MCAP_2X",
    category: "scout",
    icon: "bell",
    blurb:
      "An EventEmitter fanning out to three sinks: the console, the dashboard (SSE push + beep on the important ones), and an optional webhook in Discord/Slack-compatible shape for n8n or Telegram bridges.",
    points: ["SSE = zero-latency dashboard updates", "Webhook payload carries mint, score and deep links"],
  }),
  card("dashboard", 1330, 950, {
    title: "Live Dashboard",
    tag: "127.0.0.1:8787",
    caption: "Score, reasons, size-impact check, one-click links.",
    category: "scout",
    icon: "monitor",
    blurb:
      "A single-file, framework-free dashboard over plain node:http. It shows every tracked token with score + reasons, streams alerts live over SSE, runs a read-only Jupiter price-impact check for your size, and links out to TRiX / DexScreener / RugCheck.",
    points: ["The human decides here — the tool only argues its case", "Watchlist toggle feeds the MCAP_2X watcher"],
  }),
  card("wallet", 1040, 1160, {
    title: "Hot Wallet",
    tag: "ed25519 · LOCAL",
    caption: "Base58 key, signs Jupiter txs by hand. Never leaves disk.",
    category: "scout",
    icon: "key",
    blurb:
      "A dedicated, small hot wallet. Signing is done with Node's built-in ed25519 against Jupiter's serialized transaction — the byte layout is parsed manually (compact-u16, static keys) and only the signed bytes go to the RPC.",
    points: ["Phantom-format base58 secret, 32- or 64-byte", "Dedicated wallet, dust-sized balance — by design"],
  }),
  card("cli", 1330, 1160, {
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
  card("s1", 1700, 930, {
    title: "Early Window Entry",
    tag: "PLAY 01",
    caption: "Fresh launch, $5K–$250K mcap, before the crowd.",
    category: "strategy",
    icon: "sunrise",
    blurb:
      "The core MINE HARDER pattern: take a small position in a fresh ecosystem launch while mcap sits inside the early window, betting that ecosystem attention finds it. Freshness and window position are the two biggest score components — deliberately.",
    points: ["Window: MCAP_MIN 5K → MCAP_MAX 250K (tunable)", "< 1h old is worth nearly a fifth of the max score", "Entry on-curve happens on trix.market itself"],
  }),
  card("s2", 1700, 1100, {
    title: "Bond Catalyst",
    tag: "PLAY 02",
    caption: "Buy the graduation — first 3h after Raydium listing.",
    category: "strategy",
    icon: "zap",
    blurb:
      "Bonding turns a closed curve into an open market: Jupiter routing, screener listings, bot flow. The play is entering just-bonded tokens with real liquidity, inside the catalyst window, before broader discovery.",
    points: ["BONDED alert = the starting gun", "Check liquidity ≥ $8K and LP lock before size", "Catalyst premium decays after ~3 hours"],
  }),
  card("s3", 1700, 1270, {
    title: "Safety Gate",
    tag: "PLAY 03 · VETO",
    caption: "Hard zeros: authorities, test tokens, dust caps.",
    category: "risk",
    icon: "shield-alert",
    blurb:
      "Not a scoring nudge — a veto. Live mint authority, live freeze authority, 'test / do not buy' names, and dust mcaps zero the score outright. Low LP lock and concentrated top-10 holders take heavy penalties. The scanner reduces obvious rugs; it does not make this safe.",
    points: ["Mint/freeze authority present → score 0", "LP < 50% locked: −15 · top-10 ≥ 50%: −12", "RugCheck flags (honeypot, copycat…) stack −6 each"],
  }),
  card("s4", 1700, 1440, {
    title: "Creator Reputation",
    tag: "PLAY 04",
    caption: "Back proven builders, fade serial rug launchers.",
    category: "strategy",
    icon: "fingerprint",
    blurb:
      "TRiX makes creator history public, so use it: verified creators with points and a previous $100K+ launch earn trust; wallets with a graveyard of dead launches get faded automatically.",
    points: ["Best other launch ≥ $100K: +5", "≥ 3 dead launches outnumbering alive ones: −10", "First-time creators: neutral — no history, no bonus"],
  }),
  card("s5", 1700, 1610, {
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
  // pond0x flywheel: check in → mine → wPOND → lock → boost → mine harder
  edge("e-pond0x-checkin", "pond0x", "checkin", "flow", "pair ETH + SOL"),
  edge("e-checkin-swap", "checkin", "swap", "flow", "one account · both chains"),
  edge("e-mining-tokens", "mining", "tokens", "flow", "mines $wPOND", true),
  edge("e-tokens-water", "tokens", "water", "flow", "lock $wPOND"),
  edge("e-water-mining", "water", "mining", "flow", "mining boost ↑", true),
  edge("e-mining-spawn", "mining", "spawn", "flow", "claims open spawns"),
  edge("e-spawn-tokens", "spawn", "tokens", "flow", "highest-supply token"),
  edge("e-auction-mining", "auction", "mining", "flow", "rented hashpower"),
  edge("e-swap-pond0x", "swap", "pond0x", "flow", "~1% fee → reward pool", true),

  // attention feeds the launchpad — and compounds back into the pond
  edge("e-mining-attention", "mining", "attention", "flow", "MINE HARDER crowd", true),
  edge("e-jimmy-attention", "jimmy", "attention", "trix", "runs boosts · verify"),
  edge("e-attention-pond0x", "attention", "pond0x", "flow", "attention compounds"),
  edge("e-raydium-swap", "raydium", "swap", "flow", "liquidity aggregated by Pond D🤝X"),
  edge("e-cli-pond0x", "cli", "pond0x", "flow", "edge rotates back into the pond"),

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
