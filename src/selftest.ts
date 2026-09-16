/** Offline self-test: base58, wallet signing layout, scoring, DB. Run: npm run selftest */
import { generateKeyPairSync, verify as edVerify, createPublicKey } from "node:crypto";
import assert from "node:assert/strict";
import { b58decode, b58encode } from "./util.js";
import { signTransactionBase64, loadWallet } from "./trade/wallet.js";
import { scoreToken } from "./scoring.js";
import { getDb, upsertToken, getToken, listTokens, addAlert, hasAlert } from "./db.js";
import { config } from "./config.js";
import { simulateTrade, DEFAULT_PARAMS } from "./backtest.js";

// 1. base58 round trip incl. leading zeros
const sample = new Uint8Array([0, 0, 1, 2, 3, 255, 128, 7]);
assert.deepEqual(b58decode(b58encode(sample)), sample);
assert.equal(b58encode(b58decode("So11111111111111111111111111111111111111112")), "So11111111111111111111111111111111111111112");
console.log("✓ base58");

// 2. wallet + signing on a synthetic v0 transaction with 2 required signers, us at index 1
const { privateKey } = generateKeyPairSync("ed25519");
const pkcs8 = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
const seed = pkcs8.subarray(pkcs8.length - 32);
const spki = createPublicKey(privateKey).export({ format: "der", type: "spki" }) as Buffer;
const pub = spki.subarray(spki.length - 32);
process.env.WALLET_SECRET = b58encode(new Uint8Array(Buffer.concat([seed, pub])));
(config as { walletSecret: string }).walletSecret = process.env.WALLET_SECRET;
const w = loadWallet();
assert.equal(w.publicKey, b58encode(new Uint8Array(pub)));
const other = Buffer.alloc(32, 9);
const msg = Buffer.concat([Buffer.from([0x80, 2, 0, 1, 3]), other, pub, Buffer.alloc(32, 5), Buffer.alloc(40, 1)]); // v0, 2 signers, 3 keys
const tx = Buffer.concat([Buffer.from([2]), Buffer.alloc(128, 0), msg]);
const signed = Buffer.from(signTransactionBase64(tx.toString("base64"), w), "base64");
const sig = signed.subarray(1 + 64, 1 + 128);
assert.ok(edVerify(null, msg, createPublicKey(privateKey), sig), "signature verifies");
assert.ok(signed.subarray(1, 65).every((b) => b === 0), "other signer slot untouched");
console.log("✓ wallet load + tx signing layout");

// 3. scoring sanity on a MINE-HARDER-like row
process.env.DB_PATH = ":memory:";
(config as { dbPath: string }).dbPath = ":memory:";
getDb();
upsertToken({
  mint: "41yaqmU5vgoTyVxe6SJEKpR3B3bSnqsc9hFkcACnTRiX", name: "MINE HARDER", symbol: "MINE", description: "ITS NOT REAL",
  created_at: new Date(Date.now() - 2 * 3600e3).toISOString(), creator_username: "drag0n", creator_verified: 1, creator_points: 57031,
  creator_launches: 1, stage: "bonded", bonded_at: new Date(Date.now() - 60 * 60e3).toISOString(), boosted: 1, coin_verified: 0,
  trix_mcap: 49000, liquidity_usd: 19000, vol24_usd: 18000, buys24: 344, sells24: 204, lp_locked_pct: 100, mint_auth: 0, freeze_auth: 0, top10_pct: 46, rug_risks: "[]",
});
const t = getToken("41yaqmU5vgoTyVxe6SJEKpR3B3bSnqsc9hFkcACnTRiX")!;
const r = scoreToken(t);
console.log(`  MINE HARDER fixture → score ${r.score}`);
for (const x of r.reasons) console.log("   ", x);
assert.ok(r.score > 40 && r.score < 90);
upsertToken({ mint: "TEST", name: "Test", symbol: "T", description: "Test token do not buy.", created_at: new Date().toISOString(), trix_mcap: 2800 });
assert.equal(scoreToken(getToken("TEST")!).score, 0);
assert.equal(listTokens({ limit: 10 }).length, 2);
addAlert({ mint: "TEST", kind: "NEW_LAUNCH", title: "t", body: "b" });
assert.ok(hasAlert("TEST", "NEW_LAUNCH") && !hasAlert("TEST", "BONDED"));
console.log("✓ scoring + sqlite");

/* ---------------------------------------------------- backtest simulation */
{
  const p = { ...DEFAULT_PARAMS, feeRoundTrip: 0 }; // fee-free maths is easier to assert
  const at = (h: number) => new Date(Date.UTC(2026, 0, 1, h)).toISOString();

  // flat price → round trip returns the stake
  const flat = simulateTrade([{ ts: at(0), price: 1 }, { ts: at(1), price: 1 }], p)!;
  assert.ok(Math.abs(flat.roi) < 1e-9);

  // 2x then back to entry: half sold at 2x, remainder trails out
  const spike = simulateTrade(
    [{ ts: at(0), price: 1 }, { ts: at(1), price: 2 }, { ts: at(2), price: 1.4 }],
    p,
  )!;
  assert.equal(spike.exits[0].reason, "take-half");
  assert.equal(spike.exits[1].reason, "trailing-stop"); // 1.4 <= 0.75 * peak 2
  assert.ok(Math.abs(spike.roi - 0.7) < 1e-9); // 0.5 tokens @2 + 0.5 @1.4 - 1 stake
  assert.ok(spike.closed);

  // crash below the hard stop exits everything at once
  const crash = simulateTrade([{ ts: at(0), price: 1 }, { ts: at(1), price: 0.2 }], p)!;
  assert.equal(crash.exits.length, 1);
  assert.equal(crash.exits[0].reason, "hard-stop");
  assert.ok(Math.abs(crash.roi + 0.8) < 1e-9);

  // a stop that never triggers ends open, marked to the last price
  const open = simulateTrade([{ ts: at(0), price: 1 }, { ts: at(1), price: 1.2 }], p)!;
  assert.equal(open.closed, false);
  assert.equal(open.exits[0].reason, "end-of-data");
  assert.ok(Math.abs(open.roi - 0.2) < 1e-9);

  // time stop fires once the hold exceeds maxHoldHours
  const slow = simulateTrade([{ ts: at(0), price: 1 }, { ts: at(60), price: 1.1 }], p)!;
  assert.equal(slow.exits[0].reason, "time-stop");

  // fees bite both legs: 4% round trip on a flat price loses ~4%
  const fee = simulateTrade([{ ts: at(0), price: 1 }, { ts: at(1), price: 1 }], DEFAULT_PARAMS)!;
  assert.ok(fee.roi < -0.039 && fee.roi > -0.041);

  // degenerate input is refused, not crashed on
  assert.equal(simulateTrade([], DEFAULT_PARAMS), null);
  assert.equal(simulateTrade([{ ts: at(0), price: 0 }], DEFAULT_PARAMS), null);
  console.log("✓ backtest simulation");
}

console.log("all self-tests passed");
