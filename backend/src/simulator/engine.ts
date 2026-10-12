/**
 * GPS + Telemetry Simulator Engine
 *
 * Simulates realistic vehicle movement within Pune's bounding box.
 * Writes GPS pings to the database and updates vehicle_telemetry.
 * Broadcasts updates via WebSocket.
 *
 * Each vehicle follows a sinusoidal path offset by its index
 * (matches the frontend mock-data pattern for continuity).
 */

import { pool } from "../db/pool.js";
import { wsManager, type VehicleTelemetryMsg } from "../ws/server.js";
import { config } from "../config.js";

// Pune approx bounding box
const PUNE_BOUNDS = {
  minLat: 18.43, maxLat: 18.63,
  minLon: 73.75, maxLon: 73.97,
};

type VehicleState = {
  id: number;
  vid_code: string;
  status: string;
  lat: number;
  lon: number;
  speed_kmh: number;
  heading_deg: number;
  fuel_level: number;
  load_percent: number;
  ignition_on: boolean;
  driver_name: string | null;
  zone_name: string | null;
  route_code: string | null;
};

function toNum(v: unknown): number { return Number(v ?? 0); }

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

class SimulatorEngine {
  private vehicles: VehicleState[] = [];
  private timer: NodeJS.Timeout | null = null;
  private tick = 0;

  async init() {
    console.log("[sim] Loading vehicles from database...");
    const { rows } = await pool.query<VehicleState>(`
      SELECT
        v.id,
        v.vehicle_id   AS vid_code,
        vt.status,
        vt.lat,
        vt.lon,
        vt.speed_kmh,
        COALESCE(vt.heading_deg, 0) AS heading_deg,
        vt.fuel_level,
        vt.load_percent,
        vt.ignition_on,
        d.name         AS driver_name,
        z.name         AS zone_name,
        r.route_code
      FROM vehicles v
      JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
      LEFT JOIN drivers d ON d.id = v.driver_id
      LEFT JOIN zones z   ON z.id = v.zone_id
      LEFT JOIN routes r  ON r.vehicle_id = v.id
                         AND r.route_date = CURRENT_DATE
                         AND r.status NOT IN ('Cancelled','Completed')
      WHERE v.is_active = TRUE
      ORDER BY v.id
    `);
    this.vehicles = rows.map(r => ({
      ...r,
      lat:          toNum(r.lat),
      lon:          toNum(r.lon),
      speed_kmh:    toNum(r.speed_kmh),
      heading_deg:  toNum(r.heading_deg),
      fuel_level:   toNum(r.fuel_level),
      load_percent: toNum(r.load_percent),
    }));
    console.log(`[sim] Loaded ${this.vehicles.length} vehicles.`);
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), config.simulatorIntervalMs);
    console.log(`[sim] Running at ${config.simulatorIntervalMs}ms intervals.`);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async step() {
    this.tick++;
    const now = Date.now();
    const updates: VehicleTelemetryMsg[] = [];
    const pingRows: Array<{
      vehicle_id: number; lat: number; lon: number; speed: number;
      heading: number; fuel: number; load: number; ignition: boolean;
    }> = [];

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i]!;

      // Static vehicles don't move
      if (v.status === "Offline" || v.status === "Maintenance") {
        updates.push(this.toMsg(v));
        continue;
      }

      // Simulate movement — smooth sinusoidal drift within Pune bounds
      const t = now / 1000;
      const dLat = Math.sin(t / 30 + i * 0.4) * 0.0003;
      const dLon = Math.cos(t / 35 + i * 0.3) * 0.0004;

      v.lat = clamp(v.lat + dLat, PUNE_BOUNDS.minLat, PUNE_BOUNDS.maxLat);
      v.lon = clamp(v.lon + dLon, PUNE_BOUNDS.minLon, PUNE_BOUNDS.maxLon);

      // Speed — random walk
      v.speed_kmh = clamp(
        v.speed_kmh + (Math.sin(t / 10 + i) * 2),
        v.status === "Idle" ? 0 : 5,
        v.status === "Collecting" ? 25 : 60,
      );

      // Heading — approximate direction from velocity
      v.heading_deg = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;

      // Fuel drains slowly
      v.fuel_level = clamp(v.fuel_level - 0.03, 3, 100);

      // Load increases while collecting
      if (v.status === "Collecting") {
        v.load_percent = clamp(v.load_percent + 0.05, 0, 100);
      }

      // Occasional status transition
      if (this.tick % 50 === 0 && i % 7 === 0) {
        v.status = v.status === "Collecting" ? "Traveling" : "Collecting";
      }

      // Random emergency/delay injection (rare)
      if (this.tick % 200 === i % 200 && i < 5) {
        const prev = v.status;
        v.status = "Delayed";
        setTimeout(() => { if (this.vehicles[i]) this.vehicles[i]!.status = prev; }, 30_000);
      }

      v.ignition_on = true;

      updates.push(this.toMsg(v));
      pingRows.push({
        vehicle_id: v.id,
        lat: v.lat, lon: v.lon,
        speed: v.speed_kmh, heading: v.heading_deg,
        fuel: v.fuel_level, load: v.load_percent,
        ignition: v.ignition_on,
      });
    }

    // Broadcast to WebSocket clients
    wsManager.broadcastTelemetry(updates);

    // Write to DB in bulk (async, non-blocking for the broadcast)
    this.persistAsync(pingRows).catch((err) =>
      console.error("[sim] DB persist error:", err),
    );
  }

  private toMsg(v: VehicleState): VehicleTelemetryMsg {
    return {
      vehicle_id:  v.id,
      vid_code:    v.vid_code,
      status:      v.status,
      lat:         Number(v.lat.toFixed(7)),
      lon:         Number(v.lon.toFixed(7)),
      speed_kmh:   Number(v.speed_kmh.toFixed(1)),
      heading_deg: Math.round(v.heading_deg),
      fuel_level:  Number(v.fuel_level.toFixed(1)),
      load_percent: Number(v.load_percent.toFixed(1)),
      ignition_on: v.ignition_on,
      updated_at:  new Date().toISOString(),
      driver_name: v.driver_name,
      zone_name:   v.zone_name,
      route_code:  v.route_code,
    };
  }

  private async persistAsync(
    rows: Array<{
      vehicle_id: number; lat: number; lon: number; speed: number;
      heading: number; fuel: number; load: number; ignition: boolean;
    }>,
  ) {
    if (rows.length === 0) return;

    const client = await pool.connect();
    try {
      // Bulk upsert telemetry snapshot
      await client.query("BEGIN");

      for (const r of rows) {
        await client.query(
          `UPDATE vehicle_telemetry SET
             status      = (SELECT status FROM vehicles WHERE id=$1),
             lat=$2, lon=$3,
             location    = ST_SetSRID(ST_MakePoint(${r.lon}, ${r.lat}), 4326),
             speed_kmh=$4, heading_deg=$5,
             fuel_level=$6, load_percent=$7,
             ignition_on=$8, updated_at=NOW()
           WHERE vehicle_id=$1`,
          [r.vehicle_id, r.lat, r.lon, r.speed, r.heading,
           r.fuel, r.load, r.ignition],
        );
      }

      // Insert GPS pings (batch insert)
      const values = rows.map((r) =>
        `(${r.vehicle_id}, ${r.lat}, ${r.lon}, ST_SetSRID(ST_MakePoint(${r.lon}, ${r.lat}), 4326), ${r.speed}, ${r.heading}, ${r.fuel}, ${r.load}, ${r.ignition})`
      ).join(",");

      await client.query(
        `INSERT INTO gps_pings (vehicle_id, lat, lon, location,
           speed_kmh, heading_deg, fuel_level, load_percent, ignition_on)
         VALUES ${values}`,
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export const simulator = new SimulatorEngine();
