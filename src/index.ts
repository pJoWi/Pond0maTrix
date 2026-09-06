import { config } from "./config.js";
import { getDb } from "./db.js";
import { enrichOnce, runLoops, scanOnce } from "./scanner.js";
import { startServer } from "./server.js";

getDb();
console.log(`pond-scout · rpc=${config.rpcUrl.replace(/api-key=.*/, "api-key=***")} · scan every ${config.scanIntervalSec}s · alert score ≥ ${config.alertScoreMin}`);

if (process.argv.includes("--once")) {
  await scanOnce();
  await enrichOnce();
  process.exit(0);
}

startServer();
await runLoops();
