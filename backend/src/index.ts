import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { wsManager } from "./ws/server.js";
import { simulator } from "./simulator/engine.js";

import vehicleRouter    from "./routes/vehicles.js";
import zoneRouter       from "./routes/zones.js";
import routeRouter      from "./routes/routes.js";
import alertRouter      from "./routes/alerts.js";
import analyticsRouter  from "./routes/analytics.js";
import driverRouter     from "./routes/drivers.js";
import weighbridgeRouter from "./routes/weighbridge.js";
import referenceRouter  from "./routes/reference.js";
import authRouter       from "./routes/auth.js";
import { requireAuth }  from "./middleware/auth.js";

const app = express();

// ---- Middleware ----
app.use(cors({
  origin: (origin, cb) => {
    // Allow any localhost origin (any port) + requests with no origin (curl, Postman)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// ---- Health check ----
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      db: "connected",
      ws_clients: wsManager.connectedCount,
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// ---- API Routes ----
app.use("/api/auth",      authRouter);            // public — login/logout
app.use("/api/reference", referenceRouter);       // public — static geo data

// All routes below require a valid JWT
app.use("/api/vehicles",    requireAuth, vehicleRouter);
app.use("/api/zones",       requireAuth, zoneRouter);
app.use("/api/routes",      requireAuth, routeRouter);
app.use("/api/alerts",      requireAuth, alertRouter);
app.use("/api/analytics",   requireAuth, analyticsRouter);
app.use("/api/drivers",     requireAuth, driverRouter);
app.use("/api/weighbridge", requireAuth, weighbridgeRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---- Start ----
async function start() {
  // Verify DB connection
  try {
    await pool.query("SELECT 1");
    console.log("[server] ✅ Database connected.");
  } catch (err) {
    console.error("[server] ❌ Database connection failed:", err);
    process.exit(1);
  }

  // Start WebSocket server
  wsManager.start(config.wsPort);

  // Start GPS simulator
  await simulator.init();
  simulator.start();

  // Start HTTP server
  app.listen(config.port, () => {
    console.log(`[server] HTTP  → http://localhost:${config.port}`);
    console.log(`[server] WS   → ws://localhost:${config.wsPort}`);
    console.log(`[server] Health → http://localhost:${config.port}/health`);
  });
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[server] Shutting down...");
  simulator.stop();
  await pool.end();
  process.exit(0);
});
