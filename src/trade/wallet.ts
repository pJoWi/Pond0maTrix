/**
 * Local hot-wallet signing with Node's built-in ed25519 — no @solana/web3.js needed.
 * WALLET_SECRET is a base58 64-byte secret key (Phantom export format) or a 32-byte seed.
 */
import { createPrivateKey, createPublicKey, sign as edSign, type KeyObject } from "node:crypto";
import { config } from "../config.js";
import { b58decode, b58encode } from "../util.js";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export interface Wallet { publicKey: string; pubkeyBytes: Uint8Array; key: KeyObject }

export function loadWallet(): Wallet {
  if (!config.walletSecret) throw new Error("WALLET_SECRET not set in .env (use a small dedicated hot wallet)");
  const raw = b58decode(config.walletSecret.trim());
  const seed = raw.length === 64 ? raw.slice(0, 32) : raw;
  if (seed.length !== 32) throw new Error(`WALLET_SECRET must decode to 32 or 64 bytes, got ${raw.length}`);
  const key = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seed)]), format: "der", type: "pkcs8" });
  const spki = createPublicKey(key).export({ format: "der", type: "spki" }) as Buffer;
  const pubkeyBytes = new Uint8Array(spki.subarray(spki.length - 32));
  if (raw.length === 64) {
    const embedded = raw.slice(32);
    if (Buffer.compare(Buffer.from(embedded), Buffer.from(pubkeyBytes)) !== 0) throw new Error("WALLET_SECRET public half does not match seed");
  }
  return { publicKey: b58encode(pubkeyBytes), pubkeyBytes, key };
}

// ---- compact-u16 helpers (Solana "shortvec") ----
function readCompactU16(buf: Uint8Array, off: number): [number, number] {
  let len = 0, size = 0;
  for (;;) {
    const b = buf[off + size];
    len |= (b & 0x7f) << (7 * size);
    size++;
    if ((b & 0x80) === 0) break;
  }
  return [len, size];
}

/**
 * Sign a serialized (legacy or v0) transaction as returned by Jupiter's /swap (base64).
 * Layout: compact-u16 numSignatures | numSignatures×64 bytes | message.
 * Message: [0x80|version]? | header(3) | compact-u16 numKeys | keys×32 | ...
 * We locate our pubkey among the static keys (it must be within the first numRequiredSignatures) and drop our signature there.
 */
export function signTransactionBase64(txBase64: string, w: Wallet): string {
  const tx = new Uint8Array(Buffer.from(txBase64, "base64"));
  const [numSigs, sigLenSize] = readCompactU16(tx, 0);
  const msgStart = sigLenSize + numSigs * 64;
  const msg = tx.subarray(msgStart);

  let p = 0;
  if ((msg[0] & 0x80) !== 0) p = 1; // versioned prefix
  const numRequiredSignatures = msg[p];
  p += 3;
  const [numKeys, nkSize] = readCompactU16(msg, p);
  p += nkSize;
  let signerIndex = -1;
  for (let i = 0; i < numKeys; i++) {
    const k = msg.subarray(p + i * 32, p + (i + 1) * 32);
    if (Buffer.compare(Buffer.from(k), Buffer.from(w.pubkeyBytes)) === 0) { signerIndex = i; break; }
  }
  if (signerIndex < 0 || signerIndex >= numRequiredSignatures) throw new Error("wallet is not a required signer of this transaction");

  const sig = edSign(null, msg, w.key);
  const out = new Uint8Array(tx);
  out.set(sig, sigLenSize + signerIndex * 64);
  return Buffer.from(out).toString("base64");
}
