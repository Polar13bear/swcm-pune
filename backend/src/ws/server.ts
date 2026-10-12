/**
 * WebSocket server — broadcasts real-time telemetry to all connected clients.
 *
 * Message types (server → client):
 *   { type: "telemetry",  vehicles: VehicleTelemetry[] }
 *   { type: "alert",      alert: AlertPayload }
 *   { type: "ping" }
 *
 * Message types (client → server):
 *   { type: "subscribe",  topics: string[] }  — e.g. ["telemetry", "alerts"]
 *   { type: "pong" }
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { config } from "../config.js";

export type VehicleTelemetryMsg = {
  vehicle_id: number;
  vid_code: string;
  status: string;
  lat: number;
  lon: number;
  speed_kmh: number;
  heading_deg: number | null;
  fuel_level: number;
  load_percent: number;
  ignition_on: boolean;
  updated_at: string;
  driver_name: string | null;
  zone_name: string | null;
  route_code: string | null;
};

export type AlertMsg = {
  id: number;
  severity: string;
  subject: string;
  description: string;
  created_at: string;
};

type ClientState = {
  topics: Set<string>;
  isAlive: boolean;
};

class WsManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientState>();
  private pingInterval: NodeJS.Timeout | null = null;

  start(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`[WS] WebSocket server listening on ws://localhost:${port}`);

    this.wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
      const state: ClientState = { topics: new Set(["telemetry", "alerts"]), isAlive: true };
      this.clients.set(ws, state);

      ws.on("pong", () => {
        const s = this.clients.get(ws);
        if (s) s.isAlive = true;
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type: string; topics?: string[] };
          if (msg.type === "subscribe" && Array.isArray(msg.topics)) {
            state.topics = new Set(msg.topics);
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on("close", () => this.clients.delete(ws));
      ws.on("error", () => { ws.terminate(); this.clients.delete(ws); });

      // Send welcome ping
      ws.send(JSON.stringify({ type: "ping" }));
    });

    // Heartbeat — drop dead connections every 30s
    this.pingInterval = setInterval(() => {
      for (const [ws, state] of this.clients) {
        if (!state.isAlive) { ws.terminate(); this.clients.delete(ws); continue; }
        state.isAlive = false;
        ws.ping();
      }
    }, 30_000);

    this.wss.on("close", () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
    });
  }

  broadcast(topic: string, payload: unknown) {
    const msg = JSON.stringify(payload);
    for (const [ws, state] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && state.topics.has(topic)) {
        ws.send(msg);
      }
    }
  }

  broadcastTelemetry(vehicles: VehicleTelemetryMsg[]) {
    this.broadcast("telemetry", { type: "telemetry", vehicles });
  }

  broadcastAlert(alert: AlertMsg) {
    this.broadcast("alerts", { type: "alert", alert });
  }

  get connectedCount() {
    return this.clients.size;
  }
}

export const wsManager = new WsManager();
