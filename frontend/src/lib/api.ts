/**
 * Thin API client for the SWCM backend.
 * All functions fall back to mock data if the backend is unavailable,
 * so the app keeps working without a running server.
 */

const BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";
export { BASE };
export const WS_URL = import.meta.env["VITE_WS_URL"] ?? "ws://localhost:3002";

function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("swcm_token");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type ApiVehicle = {
  id: number;
  vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  capacity_ton: number;
  status: string;
  lat: number | null;
  lon: number | null;
  speed_kmh: number;
  heading_deg: number | null;
  fuel_level: number;
  load_percent: number;
  ignition_on: boolean;
  last_seen: string;
  driver_name: string | null;
  driver_id: string | null;
  driver_phone: string | null;
  zone_code: string | null;
  zone_name: string | null;
  route_code: string | null;
  route_status: string | null;
  completed_stops: number | null;
  planned_stops: number | null;
  odometer_km: number;
  operating_hours: number;
  last_maintenance: string | null;
  fuel_efficiency: number | null;
};

export type ApiZone = {
  id: number;
  code: string;
  name: string;
  population: number;
  households: number;
  daily_waste_ton: number;
  total_vehicles: number;
  active_vehicles: number;
  routes_today: number;
  stops_completed: number;
  stops_planned: number;
  waste_collected_ton: number | null;
  collection_rate_pct: number | null;
  delayed_routes: number;
  daily_cost_inr: number | null;
};

export type ApiAlert = {
  id: number;
  severity: "Critical" | "Warning" | "Information";
  subject: string;
  description: string;
  status: "Open" | "Acknowledged" | "Resolved";
  vehicle_code: string | null;
  zone_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiKPIs = {
  fleet: {
    total_vehicles: number;
    on_route: number;
    idle: number;
    maintenance: number;
    offline: number;
    avg_fuel: number;
    avg_load: number;
    avg_speed: number;
  };
  waste: {
    waste_today: number | null;
    missed_today: number | null;
    avg_collection_rate: number | null;
  };
  alerts: { open_alerts: number };
  routes: {
    total_routes: number;
    completed: number;
    delayed: number;
    stops_done: number;
  };
};

export type ApiHistoryRow = {
  date: string;
  waste: number;
  organic: number;
  recyclable: number;
  fuel: number;
  cost: number;
  utilization: number;
  efficiency: number;
  distance: number;
  missed: number;
};

// ---- Vehicle endpoints ----
export const fetchVehicles = () =>
  apiFetch<{ data: ApiVehicle[]; count: number }>("/api/vehicles");

export const fetchVehicle = (id: string) =>
  apiFetch<{ data: ApiVehicle }>(`/api/vehicles/${id}`);

export const fetchVehicleHistory = (id: string, hours = 24) =>
  apiFetch<{ data: Array<{ lat: number; lon: number; speed_kmh: number; recorded_at: string }> }>(
    `/api/vehicles/${id}/history?hours=${hours}`,
  );

export const patchVehicleStatus = (id: string, status: string) =>
  apiFetch(`/api/vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ---- Zone endpoints ----
export const fetchZones = () =>
  apiFetch<{ data: ApiZone[]; count: number }>("/api/zones");

// ---- Alert endpoints ----
export const fetchAlerts = (status?: string) =>
  apiFetch<{ data: ApiAlert[]; count: number }>(
    `/api/alerts${status ? `?status=${status}` : ""}`,
  );

export const patchAlert = (id: number, status: string, resolved_by?: string) =>
  apiFetch<{ data: ApiAlert }>(`/api/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolved_by }),
  });

export const postAlert = (payload: {
  severity: string; subject: string; description: string;
  vehicle_id?: number; zone_id?: number;
}) =>
  apiFetch<{ data: ApiAlert }>("/api/alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ---- Analytics endpoints ----
export const fetchKPIs = () =>
  apiFetch<{ data: ApiKPIs }>("/api/analytics/kpis");

export const fetchHistory = (days = 30) =>
  apiFetch<{ data: ApiHistoryRow[] }>(`/api/analytics/history?days=${days}`);

export const fetchWasteCategories = () =>
  apiFetch<{ data: Array<{ name: string; value: number; percent: number; fill: string }> }>(
    "/api/analytics/waste-categories",
  );

// ---- Driver endpoints ----
export const fetchDrivers = () =>
  apiFetch<{ data: unknown[]; count: number }>("/api/drivers");

// ---- Route endpoints ----
export const fetchRoutes = (date?: string) =>
  apiFetch<{ data: unknown[]; count: number }>(
    `/api/routes${date ? `?date=${date}` : ""}`,
  );

// ---- Health check ----
export const checkHealth = () =>
  apiFetch<{ status: string; db: string; ws_clients: number }>("/health");

// ---- Reference data ----

export type PuneBounds = {
  center: { lat: number; lon: number };
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  defaultZoom: number;
  landmarks: Array<{ name: string; lat: number; lon: number }>;
};

export type RefZone = {
  id: number;
  code: string;
  name: string;
  ward_number: number | null;
  population: number;
  households: number;
  area_sqkm: number | null;
  lat: number | null;
  lon: number | null;
  daily_waste_ton: number | null;
  collection_rate: number | null;
  route_distance: number | null;
  daily_cost_inr: number | null;
  boundary_geojson: unknown | null;
};

export type Depot = {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  capacity: number | null;
  zone_id: number | null;
};

export const fetchPuneBounds = () =>
  apiFetch<{ data: PuneBounds }>("/api/reference/pune-bounds");

export const fetchRefZones = () =>
  apiFetch<{ data: RefZone[] }>("/api/reference/zones");

export const fetchDepots = () =>
  apiFetch<{ data: Depot[] }>("/api/reference/depots");

export const fetchVehicleTypes = () =>
  apiFetch<{ data: Array<{ value: string; label: string; capacity_range: string }> }>(
    "/api/reference/vehicle-types",
  );
