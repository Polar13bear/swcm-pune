/**
 * /api/reference  —  static reference data for the frontend
 *
 * These are datasets that don't change per-request:
 *   - Pune PMC ward/zone list with coordinates
 *   - Depot / transfer station locations
 *   - Vehicle type catalog
 *   - Waste category definitions
 *
 * Responses are cached for 5 minutes (no DB hit per request).
 */
import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

// Simple in-process cache
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  });
}

// GET /api/reference/zones  — all zones with coordinates for map rendering
router.get("/zones", async (_req, res) => {
  try {
    const data = await cached("ref:zones", async () => {
      const { rows } = await query(`
        SELECT
          id, code, name, ward_number,
          population, households, area_sqkm,
          depot_lat AS lat, depot_lon AS lon,
          daily_waste_ton, collection_rate,
          route_distance, daily_cost_inr,
          ST_AsGeoJSON(boundary)::json AS boundary_geojson
        FROM zones
        WHERE is_active = TRUE
        ORDER BY id
      `);
      return rows;
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zone reference data" });
  }
});

// GET /api/reference/depots  — depot / transfer station locations
router.get("/depots", async (_req, res) => {
  try {
    const data = await cached("ref:depots", async () => {
      const { rows } = await query(`
        SELECT id, name, address, lat, lon,
               capacity, zone_id,
               ST_AsGeoJSON(location)::json AS geojson
        FROM depots
        ORDER BY id
      `);
      return rows;
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch depot reference data" });
  }
});

// GET /api/reference/vehicle-types
router.get("/vehicle-types", (_req, res) => {
  res.json({
    data: [
      { value: "Garbage Compactor",    label: "Garbage Compactor",    icon: "truck",    capacity_range: "6–10 T" },
      { value: "Mini Tipper",          label: "Mini Tipper",          icon: "truck",    capacity_range: "2–4 T"  },
      { value: "Truck",                label: "Truck",                icon: "truck",    capacity_range: "5–8 T"  },
      { value: "Electric Waste Vehicle", label: "Electric Waste Vehicle", icon: "zap", capacity_range: "2–5 T"  },
      { value: "Transfer Vehicle",     label: "Transfer Vehicle",     icon: "truck",    capacity_range: "10–20 T"},
    ],
  });
});

// GET /api/reference/waste-categories
router.get("/waste-categories-def", (_req, res) => {
  res.json({
    data: [
      { value: "Organic",    label: "Organic / Wet Waste",    color: "var(--chart-1)", description: "Kitchen scraps, food waste, garden waste" },
      { value: "Plastic",    label: "Plastic",                color: "var(--chart-2)", description: "PET bottles, HDPE containers, polythene" },
      { value: "Paper",      label: "Paper / Cardboard",      color: "var(--chart-3)", description: "Newspapers, cartons, office paper" },
      { value: "Metal",      label: "Metal / Scrap",          color: "var(--chart-4)", description: "Tin cans, aluminum, ferrous scrap" },
      { value: "Glass",      label: "Glass",                  color: "var(--chart-5)", description: "Bottles, jars (no mirrors or window glass)" },
      { value: "Hazardous",  label: "Hazardous",              color: "#ef4444",        description: "Batteries, e-waste, chemicals, medical" },
      { value: "Inert",      label: "Inert / C&D",            color: "#a3a3a3",        description: "Construction debris, sand, stones" },
      { value: "Other",      label: "Other",                  color: "#d4d4d4",        description: "Mixed / unclassified waste" },
    ],
  });
});

// GET /api/reference/pune-bounds  — bounding box for map initialisation
router.get("/pune-bounds", (_req, res) => {
  res.json({
    data: {
      center:   { lat: 18.5204, lon: 73.8567 },   // Pune city centre
      bounds:   {
        minLat: 18.43, maxLat: 18.63,
        minLon: 73.75, maxLon: 73.97,
      },
      defaultZoom: 12,
      // Four PMC depots used as initial map markers
      landmarks: [
        { name: "Shivajinagar Central Depot",  lat: 18.5308, lon: 73.8474 },
        { name: "Hadapsar East Depot",          lat: 18.5018, lon: 73.9272 },
        { name: "Katraj South Depot",           lat: 18.4530, lon: 73.8648 },
        { name: "Pimpri North Depot",           lat: 18.6280, lon: 73.7930 },
      ],
    },
  });
});

export default router;
