/** Thin JSON-RPC client for Solana (Helius or any RPC). No SDK dependency. */
import { config } from "../config.js";

let id = 0;
export async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const j = (await res.json()) as { result?: T; error?: { code: number; message: string } };
  if (j.error) throw new Error(`${method}: ${j.error.message} (${j.error.code})`);
  return j.result as T;
}

export const getBalanceSol = async (pubkey: string) => (await rpc<{ value: number }>("getBalance", [pubkey])).value / 1e9;

export async function getTokenBalance(owner: string, mint: string): Promise<{ amount: bigint; decimals: number; uiAmount: number }> {
  const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { amount: string; decimals: number; uiAmount: number } } } } } }[] }>(
    "getTokenAccountsByOwner",
    [owner, { mint }, { encoding: "jsonParsed" }],
  );
  let amount = 0n, decimals = 0, ui = 0;
  for (const a of r.value) {
    const t = a.account.data.parsed.info.tokenAmount;
    amount += BigInt(t.amount);
    decimals = t.decimals;
    ui += t.uiAmount ?? 0;
  }
  return { amount, decimals, uiAmount: ui };
}

export async function getLatestBlockhash(): Promise<string> {
  return (await rpc<{ value: { blockhash: string } }>("getLatestBlockhash", [{ commitment: "confirmed" }])).value.blockhash;
}

export async function sendRawTransaction(base64: string): Promise<string> {
  return rpc<string>("sendTransaction", [base64, { encoding: "base64", skipPreflight: false, maxRetries: 3 }]);
}

export async function confirmSignature(sig: string, timeoutMs = 60000): Promise<"confirmed" | "failed" | "timeout"> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await rpc<{ value: ({ confirmationStatus: string; err: unknown } | null)[] }>("getSignatureStatuses", [[sig]]);
    const s = r.value[0];
    if (s) {
      if (s.err) return "failed";
      if (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized") return "confirmed";
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return "timeout";
}
