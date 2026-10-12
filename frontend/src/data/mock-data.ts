/**
 * Type definitions only — no data.
 * All runtime data is fetched from the SWCM backend API.
 * See src/lib/api.ts and src/hooks/use-api-data.ts.
 */

export type VehicleStatus =
  | "Active"
  | "Collecting"
  | "Traveling"
  | "Idle"
  | "Maintenance"
  | "Offline"
  | "Delayed"
  | "Emergency";

export type Vehicle = {
  id: string;
  number: string;
  type: string;
  driver: string;
  driverId: string;
  zone: string;
  status: VehicleStatus;
  fuel: number;
  load: number;
  mileage: number;
  distance: number;
  cost: number;
  lastMaintenance: string;
  speed: number;
  route: string;
  eta: string;
  x: number;
  y: number;
  capacity: number;
  operatingHours: number;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  zone: string;
  shift: string;
  trips: number;
  distance: number;
  score: number;
  status: "On duty" | "Break" | "Off duty";
  experience: number;
};

export type Zone = {
  id: string;
  name: string;
  population: number;
  households: number;
  dailyWaste: number;
  vehicles: number;
  collectionRate: number;
  routeDistance: number;
  cost: number;
  missed: number;
};

export type AlertItem = {
  id: number;
  severity: "Critical" | "Warning" | "Information";
  subject: string;
  description: string;
  time: string;
  status: "Open" | "Acknowledged" | "Resolved";
};

export type RouteRecord = {
  id: string;
  vehicle: string;
  driver: string;
  zone: string;
  stops: number;
  distance: number;
  time: string;
  fuel: number;
  cost: number;
  capacity: number;
  collected: number;
  status: "Completed" | "Delayed" | "On Route";
};

export type HistoryRow = {
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

// Empty arrays — kept for components still migrating; will be removed once all pages use hooks.
export const vehicles: Vehicle[] = [];
export const drivers: Driver[] = [];
export const zones: Zone[] = [];
export const routes: RouteRecord[] = [];
export const history: HistoryRow[] = [];
export const initialAlerts: AlertItem[] = [];
export const wasteCategories: Array<{ name: string; value: number; fill: string }> = [];

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
