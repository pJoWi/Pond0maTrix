/** Jupiter Swap API (quote + swap) for tokens that have bonded to Raydium. */
import { config } from "../config.js";
import { confirmSignature, getTokenBalance, sendRawTransaction } from "../sources/rpc.js";
import { loadWallet, signTransactionBase64 } from "./wallet.js";

interface Quote {
  inputMint: string; outputMint: string; inAmount: string; outAmount: string; otherAmountThreshold: string;
  priceImpactPct: string; routePlan: { swapInfo: { label: string } }[];
}

const headers = () => ({ "content-type": "application/json", ...(config.jupiterApiKey ? { "x-api-key": config.jupiterApiKey } : {}) });

export async function getQuote(inputMint: string, outputMint: string, amountRaw: bigint, slippageBps = config.slippageBps): Promise<Quote> {
  const u = new URL(`${config.jupiterBaseUrl}/quote`);
  u.searchParams.set("inputMint", inputMint);
  u.searchParams.set("outputMint", outputMint);
  u.searchParams.set("amount", amountRaw.toString());
  u.searchParams.set("slippageBps", String(slippageBps));
  u.searchParams.set("restrictIntermediateTokens", "true");
  const res = await fetch(u, { headers: headers() });
  if (!res.ok) throw new Error(`quote failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as Quote;
}

export interface SwapResult { signature: string; status: "confirmed" | "failed" | "timeout"; quote: Quote }

export async function executeSwap(quote: Quote): Promise<SwapResult> {
  const w = loadWallet();
  const res = await fetch(`${config.jupiterBaseUrl}/swap`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: w.publicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: config.priorityFeeLamports, priorityLevel: "high" } },
    }),
  });
  if (!res.ok) throw new Error(`swap build failed ${res.status}: ${await res.text()}`);
  const { swapTransaction } = (await res.json()) as { swapTransaction: string };
  const signed = signTransactionBase64(swapTransaction, w);
  const signature = await sendRawTransaction(signed);
  const status = await confirmSignature(signature);
  return { signature, status, quote };
}

/** Buy `sol` worth of `mint`. */
export async function buy(mint: string, sol: number): Promise<SwapResult> {
  const lamports = BigInt(Math.round(sol * 1e9));
  const q = await getQuote(config.wsol, mint, lamports);
  return executeSwap(q);
}

/** Sell `pct` % of the wallet's balance of `mint` back to SOL. */
export async function sell(mint: string, pct: number): Promise<SwapResult> {
  const w = loadWallet();
  const bal = await getTokenBalance(w.publicKey, mint);
  if (bal.amount === 0n) throw new Error("no balance of that token");
  const amount = (bal.amount * BigInt(Math.round(pct * 100))) / 10000n;
  const q = await getQuote(mint, config.wsol, amount);
  return executeSwap(q);
}
