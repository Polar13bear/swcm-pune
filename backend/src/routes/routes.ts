import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/routes?date=2026-10-10
router.get("/", async (req, res) => {
  try {
    const date = String(req.query["date"] ?? new Date().toISOString().split("T")[0]);
    const { rows } = await query(`
      SELECT
        r.*,
        v.vehicle_id AS vehicle_code,
        v.plate_number,
        v.vehicle_type,
        d.name       AS driver_name,
        z.name       AS zone_name,
        z.code       AS zone_code
      FROM routes r
      JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN zones z   ON z.id = r.zone_id
      WHERE r.route_date = $1
      ORDER BY r.id
    `, [date]);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

// GET /api/routes/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows: routeRows } = await query(`
      SELECT r.*, v.vehicle_id AS vehicle_code, v.plate_number,
             d.name AS driver_name, z.name AS zone_name
      FROM routes r
      JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN zones z   ON z.id = r.zone_id
      WHERE r.id=$1 OR r.route_code=$2
      LIMIT 1
    `, [parseInt(req.params.id!, 10), req.params.id]);

    if (!routeRows[0]) { res.status(404).json({ error: "Route not found" }); return; }

    const { rows: stops } = await query(
      "SELECT * FROM collection_stops WHERE route_id=$1 ORDER BY stop_sequence",
      [routeRows[0]["id"]],
    );

    res.json({ data: { ...routeRows[0], stops } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

// PATCH /api/routes/:id — update status
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body as { status: string };
    const { rows } = await query(
      `UPDATE routes SET status=$1, updated_at=NOW()
       WHERE id=$2 OR route_code=$3
       RETURNING id`,
      [status, parseInt(req.params.id!, 10), req.params.id],
    );
    if (!rows[0]) { res.status(404).json({ error: "Route not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update route" });
  }
});

export default router;
