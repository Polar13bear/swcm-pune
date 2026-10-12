/**
 * FleetMap — Real MapLibre GL map centred on Pune.
 * Uses OpenStreetMap raster tiles (no API key needed).
 * Vehicles are rendered as MapLibre markers at real lat/lon coordinates.
 * Switches to satellite (Esri World Imagery) when toggled.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Building2, Crosshair, Expand, Layers3, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/data/mock-data";
import { StatusBadge, ProgressMeter } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

// Pune city centre
const PUNE_CENTER: [number, number] = [73.8567, 18.5204];
const DEFAULT_ZOOM = 12;

// Map tile sources
const TILE_STYLES = {
  streets: {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        maxzoom: 19,
      },
    },
    layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
  },
  satellite: {
    version: 8 as const,
    sources: {
      esri: {
        type: "raster" as const,
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Tiles © Esri",
        maxzoom: 19,
      },
    },
    layers: [{ id: "esri-satellite", type: "raster" as const, source: "esri" }],
  },
};

// Marker colour per vehicle status
const MARKER_COLORS: Record<string, string> = {
  Active:      "#22c55e",
  Collecting:  "#22c55e",
  Traveling:   "#3b82f6",
  Idle:        "#f59e0b",
  Delayed:     "#f59e0b",
  Emergency:   "#ef4444",
  Maintenance: "#ef4444",
  Offline:     "#6b7280",
};

function markerColor(status: string) {
  return MARKER_COLORS[status] ?? "#3b82f6";
}

// Create a DOM element for each vehicle marker
function createMarkerEl(vehicle: Vehicle, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "fleet-marker";
  el.setAttribute("data-id", vehicle.id);

  const color = markerColor(vehicle.status);
  const pulse  = vehicle.status === "Collecting" || vehicle.status === "Active";

  el.innerHTML = `
    <div style="
      width: ${selected ? 36 : 28}px;
      height: ${selected ? 36 : 28}px;
      border-radius: 50%;
      background: ${color};
      border: ${selected ? "3px solid white" : "2px solid white"};
      box-shadow: 0 2px 8px rgba(0,0,0,0.35)${selected ? ", 0 0 0 3px " + color : ""};
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: transform 0.15s;
      ${pulse ? "animation: pulse-ring 2s ease-out infinite;" : ""}
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 4v4h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
  `;
  return el;
}

export function FleetMap({
  vehicles,
  height = "h-[440px]",
  selectedId,
  onSelect,
  optimized = false,
}: {
  vehicles: Vehicle[];
  height?: string;
  selectedId?: string | null;
  onSelect?: (v: Vehicle) => void;
  optimized?: boolean;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [satellite, setSatellite] = useState(false);
  const [mapReady, setMapReady]   = useState(false);
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM);

  const selected = vehicles.find(v => v.id === selectedId);

  // ── Initialise map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLES.streets,
      center: PUNE_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    // Depot markers
    const depots = [
      { name: "Shivajinagar Depot", lon: 73.8474, lat: 18.5308 },
      { name: "Hadapsar Depot",     lon: 73.9272, lat: 18.5018 },
      { name: "Katraj Depot",       lon: 73.8648, lat: 18.4530 },
      { name: "Pimpri Depot",       lon: 73.7930, lat: 18.6280 },
    ];
    depots.forEach(d => {
      const el = document.createElement("div");
      el.innerHTML = `
        <div title="${d.name}" style="
          width:28px;height:28px;border-radius:6px;
          background:#1e40af;border:2px solid white;
          display:grid;place-items:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>`;
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([d.lon, d.lat])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setText(d.name))
        .addTo(map);
    });

    map.on("zoom", () => setZoom(Math.round(map.getZoom())));
    map.on("load", () => setMapReady(true));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ── Toggle satellite / streets ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(satellite ? TILE_STYLES.satellite : TILE_STYLES.streets);
  }, [satellite, mapReady]);

  // ── Update vehicle markers whenever vehicles change ──────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const incoming = new Set(vehicles.map(v => v.id));

    // Remove markers for vehicles no longer in list
    for (const [id, marker] of markersRef.current) {
      if (!incoming.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const vehicle of vehicles) {
      // Skip vehicles with no real coordinates
      if (!vehicle.x || !vehicle.y) continue;

      // Convert x/y% back to lat/lon
      // x%: 3–97 maps to lon 73.75–73.97
      // y%: 4–94 maps to lat 18.63–18.43  (y inverted)
      const lon = 73.75 + ((vehicle.x - 3) / 94) * (73.97 - 73.75);
      const lat = 18.63 - ((vehicle.y - 4) / 90) * (18.63 - 18.43);

      const isSelected = vehicle.id === selectedId;
      const existing   = markersRef.current.get(vehicle.id);

      if (existing) {
        // Smoothly move existing marker
        existing.setLngLat([lon, lat]);
        // Refresh element if selection state changed
        const el = existing.getElement();
        const wasSelected = el.querySelector("div")?.style.width === "36px";
        if (wasSelected !== isSelected) {
          el.replaceChildren(createMarkerEl(vehicle, isSelected));
        }
      } else {
        // Create new marker
        const el = createMarkerEl(vehicle, isSelected);
        el.addEventListener("click", () => onSelect?.(vehicle));

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
          .setHTML(`
            <div style="font-size:12px;min-width:140px">
              <strong>${vehicle.id}</strong><br/>
              ${vehicle.number}<br/>
              <span style="color:#6b7280">${vehicle.driver}</span><br/>
              Speed: ${vehicle.speed} km/h · Fuel: ${vehicle.fuel}%
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(vehicle.id, marker);
      }
    }
  }, [vehicles, selectedId, mapReady, onSelect]);

  // ── Pan to selected vehicle ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || !selected) return;
    const lon = 73.75 + ((selected.x - 3) / 94) * (73.97 - 73.75);
    const lat = 18.63 - ((selected.y - 4) / 90) * (18.63 - 18.43);
    mapRef.current.easeTo({ center: [lon, lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 600 });
  }, [selectedId, mapReady, selected]);

  // ── Toolbar handlers ─────────────────────────────────────────────────
  const zoomIn  = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const centre  = () => mapRef.current?.easeTo({ center: PUNE_CENTER, zoom: DEFAULT_ZOOM, duration: 600 });

  return (
    <div className={cn("relative overflow-hidden rounded-md border", height)}>
      {/* MapLibre container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/80 text-sm text-muted-foreground">
          Loading Pune map…
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-md border bg-card/95 p-1 shadow-sm">
        <Button size="icon" variant="ghost" onClick={zoomIn}  aria-label="Zoom in"><Plus /></Button>
        <span className="grid min-w-8 place-items-center text-xs font-semibold">{zoom}</span>
        <Button size="icon" variant="ghost" onClick={zoomOut} aria-label="Zoom out"><Minus /></Button>
      </div>

      {/* Map style controls */}
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-card/95 p-1 shadow-sm">
        <Button size="icon" variant={satellite ? "default" : "ghost"} onClick={() => setSatellite(s => !s)} aria-label="Toggle satellite">
          <Layers3 />
        </Button>
        <Button size="icon" variant="ghost" onClick={centre} aria-label="Centre on Pune">
          <Crosshair />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-3 z-10 flex flex-wrap gap-2 rounded-md border bg-card/95 px-3 py-2 text-[10px] shadow-sm">
        {[
          ["#22c55e", "Collecting"],
          ["#3b82f6", "Traveling"],
          ["#f59e0b", "Delayed"],
          ["#ef4444", "Emergency"],
          ["#6b7280", "Offline"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <i className="size-2 rounded-full" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>

      {/* Depot legend */}
      <div className="absolute bottom-8 right-3 z-10 flex items-center gap-2 rounded-md border bg-card/95 px-3 py-2 text-[10px] shadow-sm">
        <Building2 className="size-3.5 text-primary" />
        4 PMC Depots
      </div>

      {/* Selected vehicle popup */}
      {selected && (
        <div className="absolute left-1/2 bottom-20 z-20 w-[min(320px,calc(100%-24px))] -translate-x-1/2 rounded-md border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold">{selected.number}</div>
              <div className="text-xs text-muted-foreground">{selected.id} · {selected.type}</div>
            </div>
            <StatusBadge status={selected.status} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><dt className="text-muted-foreground">Driver</dt><dd className="font-medium">{selected.driver}</dd></div>
            <div><dt className="text-muted-foreground">Route</dt><dd className="font-medium">{selected.route}</dd></div>
            <div><dt className="text-muted-foreground">Speed</dt><dd className="font-medium">{selected.speed} km/h</dd></div>
            <div><dt className="text-muted-foreground">Capacity</dt><dd className="font-medium">{selected.capacity} T</dd></div>
          </dl>
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-[70px_1fr] items-center text-xs">
              <span>Fuel</span>
              <ProgressMeter value={selected.fuel} tone={selected.fuel < 20 ? "destructive" : "info"} />
            </div>
            <div className="grid grid-cols-[70px_1fr] items-center text-xs">
              <span>Load</span>
              <ProgressMeter value={selected.load} tone={selected.load > 90 ? "warning" : "primary"} />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">
            Zone: {selected.zone} · Updated just now
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}
