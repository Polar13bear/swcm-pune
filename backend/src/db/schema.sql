-- ============================================================
-- SWCM – Smart Waste Collection Management System
-- PostgreSQL Schema (v1.0)
-- Pune Municipal Corporation
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;         -- geospatial types & functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS btree_gist;      -- GiST index support for exclusion

-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE vehicle_status AS ENUM (
  'Active', 'Collecting', 'Traveling', 'Idle',
  'Maintenance', 'Offline', 'Delayed', 'Emergency'
);

CREATE TYPE vehicle_type AS ENUM (
  'Garbage Compactor', 'Mini Tipper', 'Truck',
  'Electric Waste Vehicle', 'Transfer Vehicle'
);

CREATE TYPE driver_status AS ENUM ('On duty', 'Break', 'Off duty');

CREATE TYPE shift_type AS ENUM (
  'Morning',   -- 06:00–14:00
  'Afternoon', -- 14:00–22:00
  'Night'      -- 22:00–06:00
);

CREATE TYPE route_status AS ENUM ('Pending', 'On Route', 'Delayed', 'Completed', 'Cancelled');

CREATE TYPE alert_severity AS ENUM ('Critical', 'Warning', 'Information');

CREATE TYPE alert_status AS ENUM ('Open', 'Acknowledged', 'Resolved');

CREATE TYPE waste_category AS ENUM (
  'Organic', 'Plastic', 'Paper', 'Metal',
  'Glass', 'Hazardous', 'Inert', 'Other'
);

CREATE TYPE collection_tier AS ENUM ('DoorToDoor', 'SecondaryPoint', 'Transfer');

-- ============================================================
-- ZONES  (ward / collection areas)
-- ============================================================

CREATE TABLE zones (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(20) UNIQUE NOT NULL,    -- e.g. "ZONE-01"
  name            VARCHAR(100) NOT NULL,           -- "Central", "North", etc.
  ward_number     SMALLINT,
  population      INTEGER NOT NULL DEFAULT 0,
  households      INTEGER NOT NULL DEFAULT 0,
  area_sqkm       NUMERIC(8,3),
  boundary        GEOMETRY(POLYGON, 4326),          -- GeoJSON polygon in WGS84
  depot_lat       NUMERIC(10,7),
  depot_lon       NUMERIC(10,7),
  daily_waste_ton NUMERIC(8,3),
  collection_rate NUMERIC(5,2),                    -- %
  route_distance  NUMERIC(8,2),                    -- km
  daily_cost_inr  NUMERIC(12,2),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEPOTS  (transfer stations / garages)
-- ============================================================

CREATE TABLE depots (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  lat        NUMERIC(10,7) NOT NULL,
  lon        NUMERIC(10,7) NOT NULL,
  location   GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
               (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED,
  capacity   INTEGER,       -- max vehicles
  zone_id    INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================

CREATE TABLE drivers (
  id              SERIAL PRIMARY KEY,
  employee_id     VARCHAR(20) UNIQUE NOT NULL,   -- "D-001"
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) UNIQUE NOT NULL,
  license_number  VARCHAR(30) UNIQUE,
  license_expiry  DATE,
  zone_id         INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  shift           shift_type NOT NULL DEFAULT 'Morning',
  experience_yrs  SMALLINT NOT NULL DEFAULT 0,
  safety_score    NUMERIC(5,2),                  -- 0–100
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE vehicles (
  id                SERIAL PRIMARY KEY,
  vehicle_id        VARCHAR(20) UNIQUE NOT NULL,  -- "V-1001"
  plate_number      VARCHAR(20) UNIQUE NOT NULL,  -- "MH-12-AB-4521"
  vehicle_type      vehicle_type NOT NULL,
  capacity_ton      NUMERIC(5,2) NOT NULL,
  depot_id          INTEGER REFERENCES depots(id) ON DELETE SET NULL,
  zone_id           INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  driver_id         INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  status            vehicle_status NOT NULL DEFAULT 'Idle',
  fuel_level        NUMERIC(5,2) NOT NULL DEFAULT 100,    -- %
  load_percent      NUMERIC(5,2) NOT NULL DEFAULT 0,       -- %
  speed_kmh         NUMERIC(6,2) NOT NULL DEFAULT 0,
  heading_deg       SMALLINT,                              -- 0–359
  current_lat       NUMERIC(10,7),
  current_lon       NUMERIC(10,7),
  current_location  GEOMETRY(POINT, 4326),
  odometer_km       NUMERIC(10,2) NOT NULL DEFAULT 0,
  operating_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  last_maintenance  DATE,
  next_maintenance  DATE,
  fuel_efficiency   NUMERIC(5,2),                          -- km/L
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geospatial queries
CREATE INDEX vehicles_location_gist ON vehicles USING GIST (current_location);
CREATE INDEX vehicles_status_idx ON vehicles (status);
CREATE INDEX vehicles_zone_idx ON vehicles (zone_id);

-- ============================================================
-- GPS TELEMETRY  (time-series, high-frequency)
-- ============================================================

CREATE TABLE gps_pings (
  id           BIGSERIAL,
  vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat          NUMERIC(10,7) NOT NULL,
  lon          NUMERIC(10,7) NOT NULL,
  location     GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
                 (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED,
  speed_kmh    NUMERIC(6,2),
  heading_deg  SMALLINT,
  fuel_level   NUMERIC(5,2),
  load_percent NUMERIC(5,2),
  altitude_m   NUMERIC(7,2),
  accuracy_m   NUMERIC(6,2),
  ignition_on  BOOLEAN,
  source       VARCHAR(20) DEFAULT 'tracker',   -- 'tracker' | 'phone' | 'simulator'
  PRIMARY KEY  (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions (2026)
CREATE TABLE gps_pings_2026_01 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE gps_pings_2026_02 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE gps_pings_2026_03 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE gps_pings_2026_04 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE gps_pings_2026_05 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE gps_pings_2026_06 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE gps_pings_2026_07 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE gps_pings_2026_08 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE gps_pings_2026_09 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE gps_pings_2026_10 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE gps_pings_2026_11 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE gps_pings_2026_12 PARTITION OF gps_pings
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE gps_pings_2027_01 PARTITION OF gps_pings
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE INDEX gps_vehicle_time_idx ON gps_pings (vehicle_id, recorded_at DESC);
CREATE INDEX gps_location_gist    ON gps_pings USING GIST (location);

-- ============================================================
-- COLLECTION ROUTES  (planned routes per shift)
-- ============================================================

CREATE TABLE routes (
  id             SERIAL PRIMARY KEY,
  route_code     VARCHAR(20) UNIQUE NOT NULL,  -- "R-201"
  vehicle_id     INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id      INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  zone_id        INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  tier           collection_tier NOT NULL DEFAULT 'DoorToDoor',
  shift          shift_type NOT NULL DEFAULT 'Morning',
  route_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status         route_status NOT NULL DEFAULT 'Pending',
  planned_stops  SMALLINT,
  completed_stops SMALLINT NOT NULL DEFAULT 0,
  planned_km     NUMERIC(8,2),
  actual_km      NUMERIC(8,2),
  planned_min    SMALLINT,
  actual_min     SMALLINT,
  fuel_used_l    NUMERIC(8,3),
  waste_collected_ton NUMERIC(8,3),
  geometry       GEOMETRY(LINESTRING, 4326),    -- planned route polyline
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX routes_vehicle_date_idx ON routes (vehicle_id, route_date);
CREATE INDEX routes_zone_date_idx    ON routes (zone_id, route_date);
CREATE INDEX routes_status_idx       ON routes (status);

-- ============================================================
-- COLLECTION STOPS  (individual pickup points on a route)
-- ============================================================

CREATE TABLE collection_stops (
  id              BIGSERIAL PRIMARY KEY,
  route_id        INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_sequence   SMALLINT NOT NULL,
  address         TEXT,
  lat             NUMERIC(10,7) NOT NULL,
  lon             NUMERIC(10,7) NOT NULL,
  location        GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
                    (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED,
  expected_waste_kg NUMERIC(7,2),
  actual_waste_kg   NUMERIC(7,2),
  arrived_at      TIMESTAMPTZ,
  departed_at     TIMESTAMPTZ,
  is_collected    BOOLEAN NOT NULL DEFAULT FALSE,
  is_missed       BOOLEAN NOT NULL DEFAULT FALSE,
  miss_reason     TEXT,
  qr_scanned      BOOLEAN NOT NULL DEFAULT FALSE,
  qr_scan_time    TIMESTAMPTZ,
  worker_id       INTEGER,   -- FK to workers table (future)
  notes           TEXT
);

CREATE INDEX collection_stops_route_idx    ON collection_stops (route_id, stop_sequence);
CREATE INDEX collection_stops_location_gist ON collection_stops USING GIST (location);

-- ============================================================
-- WEIGHBRIDGE RECORDS
-- ============================================================

CREATE TABLE weighbridge_records (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id        INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  depot_id        INTEGER REFERENCES depots(id) ON DELETE SET NULL,
  weighed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tare_weight_kg  NUMERIC(10,2),   -- empty vehicle
  gross_weight_kg NUMERIC(10,2),   -- loaded vehicle
  net_weight_kg   NUMERIC(10,2) GENERATED ALWAYS AS
                    (gross_weight_kg - tare_weight_kg) STORED,
  waste_category  waste_category DEFAULT 'Other',
  ticket_number   VARCHAR(40) UNIQUE,
  operator_name   VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX weighbridge_vehicle_idx ON weighbridge_records (vehicle_id, weighed_at DESC);

-- ============================================================
-- DAILY WASTE SUMMARY  (aggregated per zone per day)
-- ============================================================

CREATE TABLE daily_waste_summary (
  id              SERIAL PRIMARY KEY,
  zone_id         INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  summary_date    DATE NOT NULL,
  total_waste_ton NUMERIC(10,3) NOT NULL DEFAULT 0,
  organic_ton     NUMERIC(10,3) NOT NULL DEFAULT 0,
  recyclable_ton  NUMERIC(10,3) NOT NULL DEFAULT 0,
  plastic_ton     NUMERIC(10,3) NOT NULL DEFAULT 0,
  paper_ton       NUMERIC(10,3) NOT NULL DEFAULT 0,
  metal_ton       NUMERIC(10,3) NOT NULL DEFAULT 0,
  hazardous_ton   NUMERIC(10,3) NOT NULL DEFAULT 0,
  vehicles_deployed SMALLINT NOT NULL DEFAULT 0,
  trips_completed   SMALLINT NOT NULL DEFAULT 0,
  collection_rate   NUMERIC(5,2),   -- %
  missed_stops      SMALLINT NOT NULL DEFAULT 0,
  fuel_consumed_l   NUMERIC(10,3),
  distance_km       NUMERIC(10,2),
  cost_inr          NUMERIC(14,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, summary_date)
);

-- ============================================================
-- FUEL LOG
-- ============================================================

CREATE TABLE fuel_logs (
  id            SERIAL PRIMARY KEY,
  vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  liters_filled NUMERIC(8,3) NOT NULL,
  cost_inr      NUMERIC(10,2),
  odometer_km   NUMERIC(10,2),
  fuel_station  VARCHAR(100),
  attendant     VARCHAR(100),
  notes         TEXT
);

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================

CREATE TABLE maintenance_logs (
  id           SERIAL PRIMARY KEY,
  vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type VARCHAR(50) NOT NULL,  -- 'Scheduled', 'Emergency', 'Inspection'
  description  TEXT,
  cost_inr     NUMERIC(10,2),
  next_due_km  NUMERIC(10,2),
  next_due_date DATE,
  technician   VARCHAR(100),
  garage       VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE alerts (
  id          SERIAL PRIMARY KEY,
  severity    alert_severity NOT NULL,
  subject     VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  zone_id     INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  route_id    INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  status      alert_status NOT NULL DEFAULT 'Open',
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alerts_status_idx   ON alerts (status, created_at DESC);
CREATE INDEX alerts_vehicle_idx  ON alerts (vehicle_id, created_at DESC);

-- ============================================================
-- FRAUD / ANOMALY FLAGS  (cross-check reported vs weighed)
-- ============================================================

CREATE TABLE fraud_flags (
  id              SERIAL PRIMARY KEY,
  vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id        INTEGER REFERENCES routes(id) ON DELETE SET NULL,
  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flag_type       VARCHAR(60) NOT NULL,  -- 'weight_mismatch', 'gps_dwell_missing', etc.
  expected_value  NUMERIC(12,4),
  actual_value    NUMERIC(12,4),
  deviation_pct   NUMERIC(7,2),
  trust_score     NUMERIC(5,2),          -- 0–100 lower = more suspicious
  description     TEXT,
  is_reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by     VARCHAR(100),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VEHICLE TELEMETRY SNAPSHOT (latest state, fast reads)
-- Kept in sync by the backend; single-row-per-vehicle.
-- ============================================================

CREATE TABLE vehicle_telemetry (
  vehicle_id    INTEGER PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  status        vehicle_status NOT NULL DEFAULT 'Idle',
  lat           NUMERIC(10,7),
  lon           NUMERIC(10,7),
  location      GEOMETRY(POINT, 4326),
  speed_kmh     NUMERIC(6,2) NOT NULL DEFAULT 0,
  heading_deg   SMALLINT,
  fuel_level    NUMERIC(5,2) NOT NULL DEFAULT 100,
  load_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ignition_on   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vehicle_telemetry_location_gist ON vehicle_telemetry USING GIST (location);

-- ============================================================
-- UTILITY: auto-update updated_at columns
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER zones_updated_at       BEFORE UPDATE ON zones       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER drivers_updated_at     BEFORE UPDATE ON drivers     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicles_updated_at    BEFORE UPDATE ON vehicles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER routes_updated_at      BEFORE UPDATE ON routes      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER alerts_updated_at      BEFORE UPDATE ON alerts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- VIEW: live fleet  (used by frontend dashboard & tracking)
-- ============================================================

CREATE OR REPLACE VIEW v_live_fleet AS
SELECT
  v.id,
  v.vehicle_id,
  v.plate_number,
  v.vehicle_type,
  v.capacity_ton,
  vt.status,
  vt.lat,
  vt.lon,
  vt.speed_kmh,
  vt.heading_deg,
  vt.fuel_level,
  vt.load_percent,
  vt.ignition_on,
  vt.updated_at  AS last_seen,
  d.name         AS driver_name,
  d.employee_id  AS driver_id,
  d.phone        AS driver_phone,
  z.code         AS zone_code,
  z.name         AS zone_name,
  r.route_code,
  r.status       AS route_status,
  r.completed_stops,
  r.planned_stops,
  v.odometer_km,
  v.operating_hours,
  v.last_maintenance,
  v.fuel_efficiency
FROM vehicles v
JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
LEFT JOIN drivers d ON d.id = v.driver_id
LEFT JOIN zones z   ON z.id = v.zone_id
LEFT JOIN routes r  ON r.vehicle_id = v.id
                   AND r.route_date = CURRENT_DATE
                   AND r.status NOT IN ('Cancelled','Completed')
WHERE v.is_active = TRUE;

-- ============================================================
-- VIEW: today's zone summary
-- ============================================================

CREATE OR REPLACE VIEW v_zone_summary_today AS
SELECT
  z.id,
  z.code,
  z.name,
  z.population,
  z.households,
  z.daily_waste_ton,
  COUNT(DISTINCT v.id)                      AS total_vehicles,
  COUNT(DISTINCT v.id) FILTER (WHERE vt.status IN ('Active','Collecting','Traveling')) AS active_vehicles,
  COUNT(DISTINCT r.id)                      AS routes_today,
  SUM(r.completed_stops)                    AS stops_completed,
  SUM(r.planned_stops)                      AS stops_planned,
  SUM(r.waste_collected_ton)                AS waste_collected_ton,
  ROUND(
    100.0 * SUM(r.completed_stops)::NUMERIC /
    NULLIF(SUM(r.planned_stops), 0), 2
  )                                         AS collection_rate_pct,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'Delayed') AS delayed_routes,
  z.daily_cost_inr
FROM zones z
LEFT JOIN vehicles v     ON v.zone_id = z.id AND v.is_active = TRUE
LEFT JOIN vehicle_telemetry vt ON vt.vehicle_id = v.id
LEFT JOIN routes r       ON r.zone_id = z.id AND r.route_date = CURRENT_DATE
GROUP BY z.id, z.code, z.name, z.population, z.households,
         z.daily_waste_ton, z.daily_cost_inr;
