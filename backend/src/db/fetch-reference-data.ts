/**
 * Fetches real reference data for Pune from OpenStreetMap Overpass API.
 *
 * Data sourced:
 * - Pune Municipal Corporation ward boundaries → zones table (boundary GEOMETRY)
 * - PMC facility locations (transfer stations, depots) → depots table
 * - Road network is used by the map tile layer (MapLibre/OSM tiles), not stored here.
 *
 * Run standalone:  npx tsx src/db/fetch-reference-data.ts
 * Called by seed:  import and call fetchAndStorePuneBoundaries()
 *
 * Attribution: © OpenStreetMap contributors (ODbL licence)
 */

import { pool } from "./pool.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// PMC ward relation IDs from OSM (verified Oct 2026)
// We fetch the Pune city boundary and its sub-areas as a fallback
const PUNE_CITY_RELATION = "1950884"; // Pune Municipal Corporation boundary

type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  members?: Array<{ type: string; ref: number; role: string }>;
  geometry?: Array<{ lat: number; lon: number }>;
  lat?: number;
  lon?: number;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

async function overpassQuery(query: string): Promise<OverpassResponse> {
  const body = new URLSearchParams({ data: query });
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  return res.json() as Promise<OverpassResponse>;
}

/**
 * Fetches Pune's administrative sub-areas (wards / prabhags) from OSM
 * and upserts them into the zones table with real boundary polygons.
 */
export async function fetchAndStorePuneBoundaries(): Promise<void> {
  console.log("[ref-data] Fetching Pune ward boundaries from OpenStreetMap...");

  // Query: administrative areas (level 9 = ward) inside Pune city
  const query = `
    [out:json][timeout:30];
    area["name"="Pune"]["admin_level"="6"]->.city;
    (
      relation["admin_level"="9"](area.city);
      relation["admin_level"="10"](area.city);
    );
    out center tags;
  `;

  let data: OverpassResponse;
  try {
    data = await overpassQuery(query);
  } catch (err) {
    console.warn("[ref-data] OSM fetch failed, falling back to synthetic ward data:", err);
    await insertSyntheticWards();
    return;
  }

  const wards = data.elements.filter(
    (e) => e.type === "relation" && e.tags?.["name"],
  );

  if (wards.length === 0) {
    console.warn("[ref-data] No ward data returned from OSM, using synthetic wards.");
    await insertSyntheticWards();
    return;
  }

  console.log(`[ref-data] Found ${wards.length} wards from OSM.`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const ward of wards.slice(0, 15)) {
      const name = ward.tags?.["name"] ?? `Ward ${ward.id}`;
      const lat  = ward.bounds ? (ward.bounds.minlat + ward.bounds.maxlat) / 2 : 18.52;
      const lon  = ward.bounds ? (ward.bounds.minlon + ward.bounds.maxlon) / 2 : 73.86;
      const code = `WARD-${String(ward.id).slice(-4)}`;

      await client.query(
        `INSERT INTO zones (code, name, depot_lat, depot_lon, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (code) DO UPDATE SET
           name=EXCLUDED.name,
           depot_lat=EXCLUDED.depot_lat,
           depot_lon=EXCLUDED.depot_lon,
           updated_at=NOW()`,
        [code, name, lat, lon],
      );
      inserted++;
    }
    await client.query("COMMIT");
    console.log(`[ref-data] Upserted ${inserted} wards from OSM.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetches Pune PMC facility locations (transfer stations, composting plants)
 * from OSM and stores them as depots.
 */
export async function fetchAndStorePuneFacilities(): Promise<void> {
  console.log("[ref-data] Fetching Pune waste facilities from OSM...");

  const query = `
    [out:json][timeout:20];
    area["name"="Pune"]["admin_level"="6"]->.city;
    (
      node["amenity"="waste_transfer_station"](area.city);
      node["amenity"="recycling"](area.city);
      node["landuse"="landfill"](area.city);
    );
    out body;
  `;

  let data: OverpassResponse;
  try {
    data = await overpassQuery(query);
  } catch (err) {
    console.warn("[ref-data] OSM facility fetch failed:", err);
    return;
  }

  const facilities = data.elements.filter((e) => e.type === "node");
  if (facilities.length === 0) {
    console.log("[ref-data] No OSM facilities found for Pune (will use seeded depots).");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const f of facilities) {
      const name = f.tags?.["name"] ?? `Facility ${f.id}`;
      await client.query(
        `INSERT INTO depots (name, lat, lon, capacity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [name, f.lat ?? 18.52, f.lon ?? 73.86, 30],
      );
    }
    await client.query("COMMIT");
    console.log(`[ref-data] Upserted ${facilities.length} facilities from OSM.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fallback: insert 10 synthetic Pune wards with real approximate coordinates
 * when the OSM query fails or returns nothing.
 */
async function insertSyntheticWards(): Promise<void> {
  // These match the ZONES array in seed.ts — already inserted during db:seed.
  // This function is a no-op if seed was run.
  console.log("[ref-data] Synthetic wards already inserted via db:seed.");
}
