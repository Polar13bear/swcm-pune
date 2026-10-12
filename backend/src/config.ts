import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  databaseUrl:
    process.env["DATABASE_URL"] ??
    `postgresql://${optional("DB_USER", "postgres")}:${optional("DB_PASSWORD", "password")}@${optional("DB_HOST", "localhost")}:${optional("DB_PORT", "5432")}/${optional("DB_NAME", "swcm_db")}`,

  port: parseInt(optional("PORT", "3001"), 10),
  wsPort: parseInt(optional("WS_PORT", "3002"), 10),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:8080"),
  simulatorIntervalMs: parseInt(optional("SIMULATOR_INTERVAL_MS", "4000"), 10),
  jwtSecret: optional("JWT_SECRET", "swcm-dev-secret-change-in-production"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "8h"),
} as const;
