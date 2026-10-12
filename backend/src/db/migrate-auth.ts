/**
 * Adds the users table and seeds default accounts.
 * Run once: npm run db:migrate-auth
 */
import { pool } from "./pool.js";
import bcrypt from "bcryptjs";

async function migrateAuth() {
  const client = await pool.connect();
  try {
    console.log("[auth-migrate] Creating users table...");
    // Create ENUM type safely
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('Admin','Supervisor','Operator','Driver');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        employee_id   VARCHAR(30) UNIQUE NOT NULL,
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          user_role NOT NULL DEFAULT 'Operator',
        zone_id       INTEGER REFERENCES zones(id) ON DELETE SET NULL,
        driver_id     INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        last_login    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
      CREATE INDEX IF NOT EXISTS users_role_idx  ON users (role);
    `);

    // Seed default accounts
    const defaults = [
      { employee_id: "ADMIN-001", name: "PMC Administrator",      email: "admin@pmc.gov.in",      password: "Admin@1234",      role: "Admin",      zone_id: null },
      { employee_id: "SUP-Z01",   name: "Supervisor Central",     email: "sup.central@pmc.gov.in", password: "Sup@Central1",   role: "Supervisor", zone_id: 21   },
      { employee_id: "SUP-Z04",   name: "Supervisor East",        email: "sup.east@pmc.gov.in",    password: "Sup@East1",      role: "Supervisor", zone_id: 24   },
      { employee_id: "OPR-001",   name: "Control Room Operator",  email: "ops@pmc.gov.in",         password: "Ops@1234",       role: "Operator",   zone_id: null },
      { employee_id: "DRV-001",   name: "Rajesh Patil",           email: "driver1@pmc.gov.in",     password: "Driver@1234",    role: "Driver",     zone_id: 21   },
    ];

    console.log("[auth-migrate] Seeding default users...");
    for (const u of defaults) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (employee_id, name, email, password_hash, role, zone_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO NOTHING`,
        [u.employee_id, u.name, u.email, hash, u.role, u.zone_id],
      );
      console.log(`  ✅ ${u.role.padEnd(10)} ${u.email}  password: ${u.password}`);
    }

    console.log("[auth-migrate] ✅ Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAuth().catch(err => { console.error(err); process.exit(1); });
