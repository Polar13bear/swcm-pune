/**
 * Runs the SQL schema against the database.
 * Safe to re-run — uses CREATE IF NOT EXISTS / CREATE OR REPLACE where possible.
 * For destructive changes, use db:reset instead.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log("[migrate] Connecting to database...");
  const client = await pool.connect();

  try {
    const schemaPath = path.resolve(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    console.log("[migrate] Running schema.sql...");
    await client.query(sql);
    console.log("[migrate] ✅ Schema applied successfully.");
  } catch (err) {
    console.error("[migrate] ❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
