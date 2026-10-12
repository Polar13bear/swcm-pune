# SWCM Backend — Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | |
| PostgreSQL | ≥ 15 | With **PostGIS** extension |
| npm | ≥ 10 | |

### Installing PostGIS on Windows
```
# Via PostgreSQL installer — tick "PostGIS" in the Stack Builder
# Or via Chocolatey:
choco install postgis
```

---

## 1. Create the database

```sql
-- In psql:
CREATE DATABASE swcm_db;
\c swcm_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

## 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

## 3. Install dependencies

```bash
npm install
```

## 4. Run migrations (creates all tables, views, triggers)

```bash
npm run db:migrate
```

## 5. Seed with Pune data (128 vehicles, 10 zones, 50 drivers, 30 days history)

```bash
npm run db:seed
```

## 6. Start the server

```bash
npm run dev
```

This starts:
- **HTTP API** → `http://localhost:3001`
- **WebSocket** → `ws://localhost:3002`
- **GPS Simulator** → updates vehicle positions every 4s

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server + DB health check |
| GET | `/api/vehicles` | All vehicles with live telemetry |
| GET | `/api/vehicles/:id` | Single vehicle detail |
| GET | `/api/vehicles/:id/history?hours=24` | GPS trail |
| PATCH | `/api/vehicles/:id/status` | Update vehicle status |
| GET | `/api/zones` | Zone summary (today) |
| GET | `/api/routes?date=` | Routes for a date |
| GET | `/api/alerts` | Alert list |
| POST | `/api/alerts` | Create alert |
| PATCH | `/api/alerts/:id` | Acknowledge / resolve alert |
| GET | `/api/analytics/kpis` | Dashboard KPI cards |
| GET | `/api/analytics/history?days=30` | Daily waste history |
| GET | `/api/analytics/waste-categories` | Waste composition today |
| GET | `/api/drivers` | Driver list |
| GET | `/api/weighbridge` | Weighbridge records |
| POST | `/api/weighbridge` | Record a weighbridge entry |

---

## WebSocket Messages

Connect to `ws://localhost:3002`.

### Subscribe to topics
```json
{ "type": "subscribe", "topics": ["telemetry", "alerts"] }
```

### Telemetry broadcast (every 4s)
```json
{
  "type": "telemetry",
  "vehicles": [
    {
      "vehicle_id": 1,
      "vid_code": "V-1001",
      "status": "Collecting",
      "lat": 18.5196,
      "lon": 73.8553,
      "speed_kmh": 24.5,
      "fuel_level": 67.2,
      "load_percent": 43.1,
      "updated_at": "2026-10-10T08:32:11.000Z"
    }
  ]
}
```

### Alert push (immediate)
```json
{
  "type": "alert",
  "alert": {
    "id": 42,
    "severity": "Critical",
    "subject": "V-1076",
    "description": "Hydraulic pressure alert",
    "created_at": "2026-10-10T08:35:00.000Z"
  }
}
```

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run db:migrate` | Apply schema.sql |
| `npm run db:seed` | Seed Pune data |
| `npm run db:reset` | ⚠️ Drop + recreate schema |
| `npm run simulate` | Run only the GPS simulator |
