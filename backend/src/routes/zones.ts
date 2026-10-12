import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// GET /api/zones — zone summary
router.get("/", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM v_zone_summary_today ORDER BY id");
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zones" });
  }
});

// GET /api/zones/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      "SELECT * FROM zones WHERE id=$1 OR code=$2 LIMIT 1",
      [parseInt(id!, 10), id],
    );
    if (!rows[0]) { res.status(404).json({ error: "Zone not found" }); return; }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zone" });
  }
});

export default router;
