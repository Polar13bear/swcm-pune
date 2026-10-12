/**
 * Standalone simulator entry point.
 * Run with: npm run simulate
 * This starts only the simulator (no HTTP/WS server needed).
 */
import { simulator } from "./engine.js";

console.log("[sim] Starting standalone simulator...");
simulator.init().then(() => simulator.start());

process.on("SIGINT", () => {
  console.log("\n[sim] Stopping...");
  simulator.stop();
  process.exit(0);
});
