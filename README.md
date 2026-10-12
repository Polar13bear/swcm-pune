# SWCM — Smart Waste Collection Management System
### Pune Municipal Corporation

A full-stack, real-time waste collection monitoring platform for Pune — tracking vehicles, workers, collection routes, weighbridge data, and zone performance across the city.

---

## Project Structure

```
swcm-pune/
├── frontend/        React + TanStack Router + MapLibre GL
└── backend/         Node.js + Express + PostgreSQL + WebSocket
```

---

## Features

- **Live vehicle tracking** — 128 vehicles on a real MapLibre/OSM map of Pune
- **Real-time telemetry** — GPS positions update every 4s via WebSocket
- **Role-based auth** — Admin, Supervisor, Operator, Driver with JWT
- **10 municipal zones** — real Pune ward coordinates and depot locations
- **Analytics & reports** — 30-day waste history, zone efficiency, cost trends
- **Alerts system** — live alerts with acknowledge/resolve workflow
- **PostgreSQL + PostGIS** — full schema with GPS ping partitioning

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TanStack Router, TanStack Query, Tailwind CSS v4 |
| Map | MapLibre GL + OpenStreetMap tiles |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 18 + PostGIS |
| Real-time | WebSocket (ws), JWT auth |
| Simulator | Custom GPS simulator writing to PostgreSQL |

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- PostgreSQL 18 + PostGIS

### 1. Database setup
```sql
CREATE DATABASE swcm_db;
\c swcm_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill in DB_PASSWORD
npm install
npm run db:migrate
npm run db:seed
npm run db:migrate-auth
npm run dev
```
Starts on `http://localhost:3001` + WebSocket on `ws://localhost:3002`

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```
Opens on `http://localhost:8080`

---

## Default Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pmc.gov.in | Admin@1234 |
| Supervisor | sup.central@pmc.gov.in | Sup@Central1 |
| Operator | ops@pmc.gov.in | Ops@1234 |
| Driver | driver1@pmc.gov.in | Driver@1234 |

---

## License
Pune Municipal Corporation · SWCM Platform · 2026
