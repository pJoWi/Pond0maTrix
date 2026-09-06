import { EventEmitter } from "node:events";
import { addAlert, hasAlert, type AlertRow, type TokenRow } from "./db.js";
import { config } from "./config.js";
import { fmtUsd } from "./util.js";

export type AlertKind = "NEW_LAUNCH" | "BONDED" | "BOOSTED" | "SCORE_PASS" | "MCAP_2X" | "WATCH_MOVE";

export const bus = new EventEmitter();

export function emitAlert(t: TokenRow, kind: AlertKind, body: string, once = true): AlertRow | null {
  if (once && hasAlert(t.mint, kind)) return null;
  const title = `${kind} · ${t.name} ($${t.symbol}) · score ${t.score} · mcap ${fmtUsd(t.trix_mcap)}`;
  const a = addAlert({ mint: t.mint, kind, title, body });
  bus.emit("alert", a);
  const line = `[${a.ts.slice(11, 19)}] ${title}\n    ${body}`;
  console.log(line);
  void postWebhook(title, body, t);
  return a;
}

async function postWebhook(title: string, body: string, t: TokenRow): Promise<void> {
  if (!config.alertWebhookUrl) return;
  const links = `trix: ${config.trixBase}/coin/${t.mint}  |  dexscreener: https://dexscreener.com/solana/${t.mint}  |  rugcheck: https://rugcheck.xyz/tokens/${t.mint}`;
  // Discord-compatible ("content"), Slack-compatible ("text"); other receivers get the full JSON.
  const payload = { content: `**${title}**\n${body}\n${links}`, text: `${title}\n${body}\n${links}`, mint: t.mint, score: t.score };
  try {
    await fetch(config.alertWebhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) {
    console.warn("webhook failed:", (e as Error).message);
  }
}
