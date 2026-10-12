/**
 * useLiveVehicles
 *
 * Primary source: WebSocket connection to the backend (ws://localhost:3002).
 * Fallback: REST snapshot poll every 4s if WebSocket is unavailable.
 * Last resort: local mock-data simulation (original behaviour).
 *
 * Vehicles are normalised into the same `Vehicle` shape used everywhere in the
 * frontend so no other component needs changing.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { vehicles as mockVehicles, type Vehicle } from "@/data/mock-data";
import { WS_URL, fetchVehicles, type ApiVehicle } from "@/lib/api";

// Map an API vehicle to the local Vehicle shape
function apiToVehicle(v: ApiVehicle): Vehicle {
  // Convert real lat/lon to x/y% for the SVG map
  // Pune bounding box: lat 18.43–18.63, lon 73.75–73.97
  const latRange = 18.63 - 18.43;
  const lonRange = 73.97 - 73.75;
  const x = v.lon != null ? Math.round(((v.lon - 73.75) / lonRange) * 94 + 3) : 50;
  const y = v.lat != null ? Math.round(((18.63 - v.lat) / latRange) * 86 + 4) : 50;

  return {
    id:             v.vehicle_id,
    number:         v.plate_number,
    type:           v.vehicle_type,
    driver:         v.driver_name ?? "Unassigned",
    driverId:       v.driver_id ?? "—",
    zone:           v.zone_name ?? "—",
    status:         v.status as Vehicle["status"],
    fuel:           Number(v.fuel_level ?? 0),
    load:           Number(v.load_percent ?? 0),
    mileage:        Number(v.fuel_efficiency ?? 3.2),
    distance:       0,
    cost:           0,
    lastMaintenance: v.last_maintenance ?? "—",
    speed:          Number(v.speed_kmh ?? 0),
    route:          v.route_code ?? "—",
    eta:            "—",
    x,
    y,
    capacity:       Number(v.capacity_ton ?? 4),
    operatingHours: Number(v.operating_hours ?? 0),
  };
}

// WebSocket message shape from the backend
type WsTelemetryMsg = {
  type: "telemetry";
  vehicles: Array<{
    vehicle_id: number;
    vid_code: string;
    status: string;
    lat: number;
    lon: number;
    speed_kmh: number;
    heading_deg: number | null;
    fuel_level: number;
    load_percent: number;
    ignition_on: boolean;
    updated_at: string;
    driver_name: string | null;
    zone_name: string | null;
    route_code: string | null;
  }>;
};

type WsAlertMsg = {
  type: "alert";
  alert: { id: number; severity: string; subject: string; description: string };
};

type ConnectionState = "connecting" | "connected" | "fallback" | "mock";

export function useLiveVehicles() {
  const [vehicles, setVehicles]       = useState<Vehicle[]>(mockVehicles);
  const [updated, setUpdated]         = useState(new Date());
  const [connection, setConnection]   = useState<ConnectionState>("connecting");

  const wsRef         = useRef<WebSocket | null>(null);
  const pollTimerRef  = useRef<number | null>(null);
  const mockTimerRef  = useRef<number | null>(null);
  const reconnectRef  = useRef<number | null>(null);
  const reconnectDelay = useRef(1000);

  // ---- REST poll fallback ----
  const startRestPoll = useCallback(() => {
    if (pollTimerRef.current) return;
    setConnection("fallback");
    console.info("[useLiveVehicles] Falling back to REST poll");

    const poll = async () => {
      try {
        const { data } = await fetchVehicles();
        setVehicles(data.map(apiToVehicle));
        setUpdated(new Date());
      } catch {
        // If REST also fails, drop to mock
        startMockSim();
      }
    };

    poll();
    pollTimerRef.current = window.setInterval(poll, 4000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Mock simulation fallback (original behaviour) ----
  const startMockSim = useCallback(() => {
    if (mockTimerRef.current) return;
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    setConnection("mock");
    console.info("[useLiveVehicles] Using local mock simulation");

    mockTimerRef.current = window.setInterval(() => {
      setVehicles((prev) =>
        prev.map((item, i) =>
          item.status === "Offline" || item.status === "Maintenance"
            ? item
            : {
                ...item,
                x: Math.max(3, Math.min(97, item.x + Math.sin(Date.now() / 3000 + i) * 0.35)),
                y: Math.max(4, Math.min(94, item.y + Math.cos(Date.now() / 3500 + i) * 0.25)),
                speed: Math.max(8, Math.min(58, item.speed + ((i % 3) - 1))),
                fuel:  Math.max(5, Number((item.fuel - 0.05).toFixed(1))),
                load:  Math.min(100, Number((item.load + 0.04).toFixed(1))),
              },
        ),
      );
      setUpdated(new Date());
    }, 4000);
  }, []);

  // ---- WebSocket connection ----
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    let ws: WebSocket;
    try {
      if (typeof WebSocket === "undefined") { startRestPoll(); return; }
      ws = new WebSocket(WS_URL);
    } catch {
      startRestPoll();
      return;
    }

    wsRef.current = ws;
    setConnection("connecting");

    const timeout = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        startRestPoll();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      setConnection("connected");
      reconnectDelay.current = 1000;
      console.info("[useLiveVehicles] WebSocket connected");
      // Subscribe to telemetry + alert topics
      ws.send(JSON.stringify({ type: "subscribe", topics: ["telemetry", "alerts"] }));

      // Seed initial state from REST while WS warms up
      fetchVehicles()
        .then(({ data }) => { setVehicles(data.map(apiToVehicle)); setUpdated(new Date()); })
        .catch(() => {/* WS will provide updates */});
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsTelemetryMsg | WsAlertMsg | { type: string };
        if (msg.type === "telemetry") {
          const telMsg = msg as WsTelemetryMsg;
          setVehicles((prev) => {
            const map = new Map(prev.map((v) => [v.id, v]));
            for (const t of telMsg.vehicles) {
              const existing = map.get(t.vid_code);
              if (!existing) continue;
              const latRange = 18.63 - 18.43;
              const lonRange = 73.97 - 73.75;
              const x = Math.round(((t.lon - 73.75) / lonRange) * 94 + 3);
              const y = Math.round(((18.63 - t.lat) / latRange) * 86 + 4);
              map.set(t.vid_code, {
                ...existing,
                status:  t.status as Vehicle["status"],
                x:       Math.max(3, Math.min(97, x)),
                y:       Math.max(4, Math.min(94, y)),
                speed:   Number(t.speed_kmh),
                fuel:    Number(t.fuel_level),
                load:    Number(t.load_percent),
                route:   t.route_code ?? existing.route,
              });
            }
            return Array.from(map.values());
          });
          setUpdated(new Date());
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      wsRef.current = null;
      if (connection !== "mock") {
        // Exponential backoff reconnect
        const delay = Math.min(reconnectDelay.current, 30_000);
        reconnectDelay.current = delay * 2;
        reconnectRef.current = window.setTimeout(() => {
          // Try REST while waiting to reconnect
          startRestPoll();
          connect();
        }, delay);
      }
    };
  }, [connection, startRestPoll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (pollTimerRef.current)  clearInterval(pollTimerRef.current);
      if (mockTimerRef.current)  clearInterval(mockTimerRef.current);
      if (reconnectRef.current)  clearTimeout(reconnectRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { vehicles, updated, connection };
}
