import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/drivers
router.get("/", async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        d.*,
        z.name  AS zone_name,
        v.vehicle_id AS vehicle_code,
        v.plate_number,
        vt.status    AS vehicle_status,
        COALESCE(
          (SELECT COUNT(*) FROM routes r
           WHERE r.driver_id = d.id AND r.route_date = CURRENT_DATE), 0
        ) AS trips_today,
        COALESCE(
          (SELECT SUM(r.actual_km) FROM routes r
           WHERE r.driver_id = d.id AND r.route_date = CURRENT_DATE), 0
        ) AS distance_today
      FROM drivers d
      LEFT JOIN zones z   ON z.id = d.zone_id
      LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      LEFT JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
      WHERE d.is_active = TRUE
      ORDER BY d.id
    `);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

// GET /api/drivers/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id ?? "");
    const { rows } = await query(
      `SELECT d.*, z.name AS zone_name, v.vehicle_id AS vehicle_code, v.plate_number
       FROM drivers d
       LEFT JOIN zones z ON z.id = d.zone_id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
       WHERE ${isNumeric ? "d.id=$1" : "d.employee_id=$1"}
       LIMIT 1`,
      [isNumeric ? parseInt(id!, 10) : id],
    );
    if (!rows[0]) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch driver" });
  }
});

export default router;
