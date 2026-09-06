/** Local dashboard: plain node:http + Server-Sent Events. No framework. */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { bus } from "./alerts.js";
import { getToken, listTokens, recentAlerts, setWatch, snapshots, type Stage } from "./db.js";
import { getQuote } from "./trade/jupiter.js";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(here, "..", "public", "index.html");

function json(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

const clients = new Set<ServerResponse>();
bus.on("alert", (a) => broadcast("alert", a));
bus.on("token", (t) => broadcast("token", t));
function broadcast(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b)); });
}

export function startServer(): void {
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    try {
      if (url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(htmlPath, "utf8"));
      } else if (url.pathname === "/api/tokens") {
        const stage = url.searchParams.get("stage") as Stage | null;
        json(res, 200, listTokens({
          limit: Number(url.searchParams.get("limit") ?? 300),
          minScore: url.searchParams.has("minScore") ? Number(url.searchParams.get("minScore")) : undefined,
          stage: stage ?? undefined,
          watchOnly: url.searchParams.get("watch") === "1",
        }));
      } else if (url.pathname === "/api/alerts") {
        json(res, 200, recentAlerts(Number(url.searchParams.get("limit") ?? 100)));
      } else if (url.pathname.startsWith("/api/token/")) {
        const mint = url.pathname.split("/")[3];
        const t = getToken(mint);
        if (!t) return json(res, 404, { error: "not found" });
        json(res, 200, { ...t, snapshots: snapshots(mint) });
      } else if (url.pathname === "/api/watch" && req.method === "POST") {
        const { mint, on } = JSON.parse(await readBody(req)) as { mint: string; on: boolean };
        setWatch(mint, on);
        json(res, 200, { ok: true });
      } else if (url.pathname === "/api/quote") {
        // read-only price check for the dashboard "size check" — never executes
        const mint = url.searchParams.get("mint")!;
        const sol = Number(url.searchParams.get("sol") ?? 0.1);
        const q = await getQuote(config.wsol, mint, BigInt(Math.round(sol * 1e9)));
        json(res, 200, { sol, outAmount: q.outAmount, priceImpactPct: Number(q.priceImpactPct), route: q.routePlan.map((r) => r.swapInfo.label) });
      } else if (url.pathname === "/api/config") {
        json(res, 200, { alertScoreMin: config.alertScoreMin, mcapMaxUsd: config.mcapMaxUsd, liqMinUsd: config.liqMinUsd, trixBase: config.trixBase });
      } else if (url.pathname === "/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(": hi\n\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
      } else {
        json(res, 404, { error: "not found" });
      }
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  });
  srv.listen(config.port, "127.0.0.1", () => console.log(`dashboard → http://127.0.0.1:${config.port}`));
}
