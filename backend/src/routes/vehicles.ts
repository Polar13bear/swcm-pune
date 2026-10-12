import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/vehicles — full fleet list with telemetry
router.get("/", async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        v.id, v.vehicle_id, v.plate_number, v.vehicle_type, v.capacity_ton,
        vt.status, vt.lat, vt.lon, vt.speed_kmh, vt.heading_deg,
        vt.fuel_level, vt.load_percent, vt.ignition_on, vt.updated_at AS last_seen,
        d.name       AS driver_name,
        d.employee_id AS driver_id,
        d.phone      AS driver_phone,
        z.code       AS zone_code,
        z.name       AS zone_name,
        r.route_code,
        r.status     AS route_status,
        r.completed_stops,
        r.planned_stops,
        v.odometer_km,
        v.operating_hours,
        v.last_maintenance,
        v.fuel_efficiency
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
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

// GET /api/vehicles/:id — single vehicle detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id ?? "");

    const { rows } = await query(`
      SELECT
        v.*,
        vt.status, vt.lat, vt.lon, vt.speed_kmh, vt.heading_deg,
        vt.fuel_level, vt.load_percent, vt.ignition_on, vt.updated_at AS last_seen,
        d.name       AS driver_name,
        d.employee_id AS driver_id,
        d.phone      AS driver_phone,
        d.safety_score,
        z.name       AS zone_name,
        z.code       AS zone_code
      FROM vehicles v
      JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
      LEFT JOIN drivers d ON d.id = v.driver_id
      LEFT JOIN zones z   ON z.id = v.zone_id
      WHERE ${isNumeric ? "v.id=$1" : "v.vehicle_id=$1"}
      LIMIT 1
    `, [isNumeric ? parseInt(id!, 10) : id]);

    if (!rows[0]) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicle" });
  }
});

// GET /api/vehicles/:id/history?hours=24 — GPS trail
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const hours = Math.min(parseInt(String(req.query["hours"] ?? "24"), 10), 168);
    const isNumeric = /^\d+$/.test(id ?? "");

    const { rows } = await query(`
      SELECT gp.lat, gp.lon, gp.speed_kmh, gp.heading_deg,
             gp.fuel_level, gp.load_percent, gp.recorded_at
      FROM gps_pings gp
      JOIN vehicles v ON v.id = gp.vehicle_id
      WHERE ${isNumeric ? "v.id=$1" : "v.vehicle_id=$1"}
        AND gp.recorded_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY gp.recorded_at DESC
      LIMIT 2000
    `, [isNumeric ? parseInt(id!, 10) : id]);

    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicle history" });
  }
});

// PATCH /api/vehicles/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const validStatuses = ["Active","Collecting","Traveling","Idle","Maintenance","Offline","Delayed","Emergency"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    await query(
      `UPDATE vehicle_telemetry SET status=$1, updated_at=NOW()
       WHERE vehicle_id=(SELECT id FROM vehicles WHERE vehicle_id=$2 OR id=$2::integer)`,
      [status, id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
