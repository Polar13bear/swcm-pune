import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/weighbridge?vehicle_id=&date=
router.get("/", async (req, res) => {
  try {
    const vehicleId = req.query["vehicle_id"] ? Number(req.query["vehicle_id"]) : null;
    const date = req.query["date"] ? String(req.query["date"]) : null;

    const filters: string[] = [];
    const params: unknown[] = [];

    if (vehicleId) {
      params.push(vehicleId);
      filters.push(`wr.vehicle_id=$${params.length}`);
    }
    if (date) {
      params.push(date);
      filters.push(`wr.weighed_at::DATE=$${params.length}`);
    }

    const where = filters.length ? "WHERE " + filters.join(" AND ") : "";

    const { rows } = await query(`
      SELECT wr.*, v.vehicle_id AS vehicle_code, v.plate_number,
             d.name AS depot_name
      FROM weighbridge_records wr
      JOIN vehicles v ON v.id = wr.vehicle_id
      LEFT JOIN depots d ON d.id = wr.depot_id
      ${where}
      ORDER BY wr.weighed_at DESC
      LIMIT 200
    `, params);

    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch weighbridge records" });
  }
});

// POST /api/weighbridge — record a weighbridge entry
router.post("/", async (req, res) => {
  try {
    const {
      vehicle_id, route_id, depot_id,
      tare_weight_kg, gross_weight_kg, waste_category,
      ticket_number, operator_name,
    } = req.body as {
      vehicle_id: number; route_id?: number; depot_id?: number;
      tare_weight_kg: number; gross_weight_kg: number;
      waste_category?: string; ticket_number?: string; operator_name?: string;
    };

    if (!vehicle_id || !tare_weight_kg || !gross_weight_kg) {
      res.status(400).json({ error: "vehicle_id, tare_weight_kg, and gross_weight_kg are required" });
      return;
    }
    if (gross_weight_kg <= tare_weight_kg) {
      res.status(400).json({ error: "gross_weight_kg must be greater than tare_weight_kg" });
      return;
    }

    const { rows } = await query(
      `INSERT INTO weighbridge_records
         (vehicle_id, route_id, depot_id, tare_weight_kg, gross_weight_kg,
          waste_category, ticket_number, operator_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [vehicle_id, route_id ?? null, depot_id ?? null,
       tare_weight_kg, gross_weight_kg,
       waste_category ?? "Other", ticket_number ?? null, operator_name ?? null],
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record weighbridge entry" });
  }
});

export default router;
