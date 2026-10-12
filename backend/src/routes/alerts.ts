import { Router } from "express";
import { query } from "../db/pool.js";
import { wsManager } from "../ws/server.js";

const router = Router();

// GET /api/alerts?status=Open&limit=50
router.get("/", async (req, res) => {
  try {
    const status = req.query["status"] ? String(req.query["status"]) : null;
    const limit  = Math.min(parseInt(String(req.query["limit"] ?? "100"), 10), 500);

    const { rows } = await query(`
      SELECT a.*, v.vehicle_id AS vehicle_code, z.name AS zone_name
      FROM alerts a
      LEFT JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN zones    z ON z.id = a.zone_id
      ${status ? "WHERE a.status=$1" : ""}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `, status ? [status] : []);

    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// PATCH /api/alerts/:id — acknowledge or resolve
router.patch("/:id", async (req, res) => {
  try {
    const { status, resolved_by } = req.body as { status: string; resolved_by?: string };
    const validStatuses = ["Open","Acknowledged","Resolved"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const { rows } = await query(
      `UPDATE alerts SET
         status=$1,
         resolved_by = CASE WHEN $1='Resolved' THEN $2 ELSE resolved_by END,
         resolved_at = CASE WHEN $1='Resolved' THEN NOW() ELSE resolved_at END,
         updated_at  = NOW()
       WHERE id=$3
       RETURNING *`,
      [status, resolved_by ?? "operator", parseInt(req.params.id!, 10)],
    );
    if (!rows[0]) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update alert" });
  }
});

// POST /api/alerts — create a new alert (used internally or from devices)
router.post("/", async (req, res) => {
  try {
    const { severity, subject, description, vehicle_id, zone_id } =
      req.body as {
        severity: string; subject: string; description: string;
        vehicle_id?: number; zone_id?: number;
      };

    const { rows } = await query(
      `INSERT INTO alerts (severity, subject, description, vehicle_id, zone_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [severity, subject, description, vehicle_id ?? null, zone_id ?? null],
    );

    // Push to WebSocket clients immediately
    wsManager.broadcastAlert({
      id: rows[0]?.["id"] as number,
      severity,
      subject,
      description,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

export default router;
