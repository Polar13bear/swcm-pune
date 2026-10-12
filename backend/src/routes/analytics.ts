import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/analytics/history?days=30
router.get("/history", async (req, res) => {
  try {
    const days = Math.min(parseInt(String(req.query["days"] ?? "30"), 10), 365);
    const { rows } = await query(`
      SELECT
        summary_date                        AS date,
        SUM(total_waste_ton)::NUMERIC(10,2) AS waste,
        SUM(organic_ton)::NUMERIC(10,2)     AS organic,
        SUM(recyclable_ton)::NUMERIC(10,2)  AS recyclable,
        SUM(fuel_consumed_l)::NUMERIC(10,2) AS fuel,
        SUM(cost_inr)::NUMERIC(14,2)        AS cost,
        ROUND(AVG(collection_rate),2)       AS utilization,
        ROUND(AVG(collection_rate),2)       AS efficiency,
        SUM(distance_km)::NUMERIC(10,2)     AS distance,
        SUM(missed_stops)                   AS missed
      FROM daily_waste_summary
      WHERE summary_date >= CURRENT_DATE - $1::INTEGER
      GROUP BY summary_date
      ORDER BY summary_date ASC
    `, [days]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch analytics history" });
  }
});

// GET /api/analytics/kpis — dashboard KPI cards
router.get("/kpis", async (_req, res) => {
  try {
    const { rows: fleetRows } = await query(`
      SELECT
        COUNT(*)                                              AS total_vehicles,
        COUNT(*) FILTER (WHERE vt.status IN ('Active','Collecting','Traveling')) AS on_route,
        COUNT(*) FILTER (WHERE vt.status = 'Idle')           AS idle,
        COUNT(*) FILTER (WHERE vt.status = 'Maintenance')    AS maintenance,
        COUNT(*) FILTER (WHERE vt.status = 'Offline')        AS offline,
        ROUND(AVG(vt.fuel_level),1)                          AS avg_fuel,
        ROUND(AVG(vt.load_percent),1)                        AS avg_load,
        ROUND(AVG(vt.speed_kmh) FILTER (
          WHERE vt.speed_kmh > 0
        ),1)                                                  AS avg_speed
      FROM vehicles v
      JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
      WHERE v.is_active = TRUE
    `);

    const { rows: wasteRows } = await query(`
      SELECT
        SUM(total_waste_ton)::NUMERIC(10,2)  AS waste_today,
        SUM(missed_stops)                    AS missed_today,
        ROUND(AVG(collection_rate),2)        AS avg_collection_rate
      FROM daily_waste_summary
      WHERE summary_date = CURRENT_DATE
    `);

    const { rows: alertRows } = await query(`
      SELECT COUNT(*) FILTER (WHERE status='Open') AS open_alerts
      FROM alerts
    `);

    const { rows: routeRows } = await query(`
      SELECT
        COUNT(*)                                              AS total_routes,
        COUNT(*) FILTER (WHERE status='Completed')           AS completed,
        COUNT(*) FILTER (WHERE status='Delayed')             AS delayed,
        SUM(completed_stops)                                 AS stops_done
      FROM routes
      WHERE route_date = CURRENT_DATE
    `);

    res.json({
      data: {
        fleet:  fleetRows[0],
        waste:  wasteRows[0],
        alerts: alertRows[0],
        routes: routeRows[0],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch KPIs" });
  }
});

// GET /api/analytics/waste-categories?date=today
router.get("/waste-categories", async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        SUM(organic_ton)    AS organic,
        SUM(recyclable_ton) AS recyclable,
        SUM(plastic_ton)    AS plastic,
        SUM(paper_ton)      AS paper,
        SUM(metal_ton)      AS metal
      FROM daily_waste_summary
      WHERE summary_date = CURRENT_DATE
    `);
    const r = rows[0] ?? {};
    const total = Object.values(r).reduce((s: number, v) => s + Number(v ?? 0), 0);
    const cats = [
      { name: "Organic",    value: Number(r["organic"] ?? 0),    fill: "var(--chart-1)" },
      { name: "Plastic",    value: Number(r["plastic"] ?? 0),    fill: "var(--chart-2)" },
      { name: "Paper",      value: Number(r["paper"] ?? 0),      fill: "var(--chart-3)" },
      { name: "Metal",      value: Number(r["metal"] ?? 0),      fill: "var(--chart-4)" },
      { name: "Recyclable", value: Number(r["recyclable"] ?? 0), fill: "var(--chart-5)" },
    ].map((c) => ({ ...c, percent: total > 0 ? Number(((c.value / total) * 100).toFixed(1)) : 0 }));
    res.json({ data: cats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch waste categories" });
  }
});

export default router;
