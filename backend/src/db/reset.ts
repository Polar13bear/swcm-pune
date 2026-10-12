/**
 * WARNING: Drops and recreates the entire database schema.
 * Only for development. Will destroy all data.
 */
import { pool } from "./pool.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function reset() {
  const client = await pool.connect();
  try {
    console.log("[reset] ⚠️  Dropping all tables...");

    await client.query(`
      DROP VIEW  IF EXISTS v_live_fleet CASCADE;
      DROP VIEW  IF EXISTS v_zone_summary_today CASCADE;
      DROP TABLE IF EXISTS fraud_flags CASCADE;
      DROP TABLE IF EXISTS alerts CASCADE;
      DROP TABLE IF EXISTS maintenance_logs CASCADE;
      DROP TABLE IF EXISTS fuel_logs CASCADE;
      DROP TABLE IF EXISTS daily_waste_summary CASCADE;
      DROP TABLE IF EXISTS weighbridge_records CASCADE;
      DROP TABLE IF EXISTS collection_stops CASCADE;
      DROP TABLE IF EXISTS routes CASCADE;
      DROP TABLE IF EXISTS vehicle_telemetry CASCADE;
      DROP TABLE IF EXISTS gps_pings CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS drivers CASCADE;
      DROP TABLE IF EXISTS depots CASCADE;
      DROP TABLE IF EXISTS zones CASCADE;
      DROP TYPE  IF EXISTS collection_tier CASCADE;
      DROP TYPE  IF EXISTS waste_category CASCADE;
      DROP TYPE  IF EXISTS alert_status CASCADE;
      DROP TYPE  IF EXISTS alert_severity CASCADE;
      DROP TYPE  IF EXISTS route_status CASCADE;
      DROP TYPE  IF EXISTS shift_type CASCADE;
      DROP TYPE  IF EXISTS driver_status CASCADE;
      DROP TYPE  IF EXISTS vehicle_type CASCADE;
      DROP TYPE  IF EXISTS vehicle_status CASCADE;
      DROP FUNCTION IF EXISTS set_updated_at CASCADE;
    `);

    const schemaPath = path.resolve(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    await client.query(sql);
    console.log("[reset] ✅ Schema recreated.");
  } catch (err) {
    console.error("[reset] ❌ Reset failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
