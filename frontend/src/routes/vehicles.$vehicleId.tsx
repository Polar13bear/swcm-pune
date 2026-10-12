import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, CircleDollarSign, Fuel, Gauge, MapPin, Recycle, Route as RouteIcon, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FleetMap } from "@/components/maps/fleet-map";
import { KPICard, PageHeader, SectionCard, StatusBadge } from "@/components/dashboard/shared";
import { TrendChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchVehicle, type ApiVehicle } from "@/lib/api";
import type { Vehicle } from "@/data/mock-data";

export const Route = createFileRoute("/vehicles/$vehicleId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.vehicleId} Vehicle Details — SWCM` },
      { name: "description", content: "Live municipal vehicle telemetry, route, driver, fuel, performance, and maintenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function apiToVehicle(v: ApiVehicle): Vehicle {
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
    x, y,
    capacity:       Number(v.capacity_ton ?? 4),
    operatingHours: Number(v.operating_hours ?? 0),
  };
}

function Page() {
  const params = Route.useParams();
  const vehicleId = params.vehicleId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: async () => {
      const { data } = await fetchVehicle(vehicleId);
      return data;
    },
    refetchInterval: 8_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/vehicles"><ArrowLeft /> Back to fleet</Link>
        </Button>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/vehicles"><ArrowLeft /> Back to fleet</Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Vehicle {vehicleId} not found. Check the backend is running and the vehicle ID is valid.
        </div>
      </div>
    );
  }

  const v = apiToVehicle(data);
  const api = data;

  const fuelRangeKm = Math.round((v.fuel / 100) * v.capacity * v.mileage * 10);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/vehicles"><ArrowLeft /> Back to fleet</Link>
      </Button>

      <PageHeader
        title={v.number}
        description={`${v.type} · ${v.id}`}
        meta={<div className="mt-2"><StatusBadge status={v.status} /></div>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Current Speed"   value={`${v.speed} km/h`}  detail="Moving normally" icon={Gauge} tone="info" />
        <KPICard label="Fuel Level"      value={`${v.fuel}%`}        detail={`≈ ${fuelRangeKm} km range`} icon={Fuel} tone={v.fuel < 20 ? "destructive" : "warning"} />
        <KPICard label="Waste Load"      value={`${v.load}%`}        detail={`${(v.capacity * v.load / 100).toFixed(1)} of ${v.capacity} T`} icon={Recycle} />
        <KPICard label="Route"           value={v.route}             detail={`ETA ${v.eta}`} icon={RouteIcon} tone="info" />
        <KPICard label="Operating Hours" value={`${v.operatingHours} h`} detail="This shift" icon={Clock} tone="info" />
        <KPICard label="Current Zone"    value={v.zone}              detail="Municipal zone" icon={MapPin} />
        <KPICard label="Route Status"    value={api.route_status ?? "—"} detail={`${api.completed_stops ?? 0} / ${api.planned_stops ?? "—"} stops`} icon={RouteIcon} />
        <KPICard label="Last Seen"       value={api.last_seen ? new Date(api.last_seen).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"} detail="GPS update" icon={Gauge} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard title="Live Location" subtitle={`${v.route} · Zone ${v.zone}`}>
          <FleetMap vehicles={[v]} selectedId={v.id} height="h-[430px]" />
        </SectionCard>
        <SectionCard title="Driver Information">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {(
              [
                ["Driver",          api.driver_name ?? "—"],
                ["Employee ID",     api.driver_id ?? "—"],
                ["Phone",           api.driver_phone ?? "—"],
                ["Zone",            api.zone_name ?? "—"],
                ["Vehicle type",    api.vehicle_type],
                ["Capacity",        `${api.capacity_ton} T`],
                ["Plate",           api.plate_number],
                ["Odometer",        `${Number(api.odometer_km ?? 0).toLocaleString("en-IN")} km`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <SectionCard title="Fuel Trend" subtitle="Last 14 days">
          <TrendChart kind="fuel" area days={14} />
        </SectionCard>
        <SectionCard title="Maintenance" action={<Wrench className="size-4 text-primary" />}>
          <dl className="space-y-4 text-sm">
            {(
              [
                ["Last service",     api.last_maintenance ?? "—"],
                ["Odometer",         `${Number(api.odometer_km ?? 0).toLocaleString("en-IN")} km`],
                ["Fuel efficiency",  api.fuel_efficiency ? `${api.fuel_efficiency} km/L` : "—"],
                ["Operating hours",  `${v.operatingHours} h this shift`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between border-b pb-3 last:border-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
