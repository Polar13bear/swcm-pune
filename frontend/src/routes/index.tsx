import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDollarSign, Fuel, MapPinned, Recycle, Route as RouteIcon, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FleetMap } from "@/components/maps/fleet-map";
import { KPICard, PageHeader, SectionCard, StatusBadge } from "@/components/dashboard/shared";
import { TrendChart, ZoneBarChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";
import { useKPIs, useAlerts } from "@/hooks/use-api-data";
import { ConnectionBadge } from "@/components/dashboard/connection-badge";
import { formatINR } from "@/data/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — Smart Waste Collection" },
      { name: "description", content: "Real-time municipal waste fleet operations, routes, costs, and performance." },
      { property: "og:title", content: "Smart Waste Collection Operations Dashboard" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { vehicles, updated, connection } = useLiveVehicles();
  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: alerts } = useAlerts("Open");

  const [selected, setSelected] = useState<string | null>(null);

  const fleet = kpis?.fleet;
  const wasteToday = kpis?.waste;
  const routeStats = kpis?.routes;

  const secondsAgo = Math.max(0, Math.round((Date.now() - updated.getTime()) / 1000));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Smart Waste Collection Management"
        description="Real-time fleet monitoring, route optimisation & operational intelligence"
        meta={
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <ConnectionBadge state={connection} />
            <span className="text-muted-foreground">
              · {vehicles.length} Vehicles · Updated {secondsAgo}s ago
            </span>
          </div>
        }
        actions={
          <Button asChild>
            <Link to="/route-optimization"><RouteIcon /> Optimise routes</Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpisLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <KPICard
              label="Total Vehicles"
              value={String(fleet?.total_vehicles ?? vehicles.length)}
              detail={`${fleet?.on_route ?? "—"} on route · ${fleet?.maintenance ?? "—"} maintenance`}
              icon={Truck}
            />
            <KPICard
              label="Vehicles On Route"
              value={String(fleet?.on_route ?? "—")}
              detail="Active · Collecting · Traveling"
              icon={MapPinned}
              tone="info"
            />
            <KPICard
              label="Waste Collected Today"
              value={wasteToday?.waste_today ? `${Number(wasteToday.waste_today).toFixed(1)} T` : "—"}
              detail={`${wasteToday?.missed_today ?? 0} missed stops`}
              icon={Recycle}
            />
            <KPICard
              label="Routes Today"
              value={String(routeStats?.total_routes ?? "—")}
              detail={`${routeStats?.completed ?? 0} completed · ${routeStats?.delayed ?? 0} delayed`}
              icon={RouteIcon}
              tone="info"
            />
            <KPICard
              label="Avg. Fleet Fuel"
              value={fleet?.avg_fuel ? `${fleet.avg_fuel}%` : "—"}
              detail="Fleet average"
              icon={Fuel}
              tone={fleet && fleet.avg_fuel < 25 ? "destructive" : "warning"}
            />
            <KPICard
              label="Open Alerts"
              value={String(kpis?.alerts?.open_alerts ?? alerts?.length ?? "—")}
              detail="Require attention"
              icon={CircleDollarSign}
              tone="destructive"
            />
          </>
        )}
      </div>

      {/* Map + Alerts */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.65fr)]">
        <SectionCard
          title="Live Vehicle Tracking"
          subtitle={`Pune municipal limits · ${fleet?.on_route ?? "—"} vehicles currently on route`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/tracking">Open control map</Link>
            </Button>
          }
        >
          <FleetMap
            vehicles={vehicles}
            selectedId={selected}
            onSelect={(v) => setSelected(selected === v.id ? null : v.id)}
          />
        </SectionCard>

        <SectionCard
          title="Priority Alerts"
          subtitle={`${alerts?.filter((a) => a.status === "Open").length ?? 0} open · ${alerts?.filter((a) => a.severity === "Critical" && a.status !== "Resolved").length ?? 0} critical`}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/alerts">View all</Link>
            </Button>
          }
        >
          <div className="space-y-1">
            {!alerts || alerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No open alerts</p>
            ) : (
              alerts.slice(0, 6).map((a) => (
                <div key={a.id} className="border-b py-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={a.severity} />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold">{a.subject}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.description}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Trend Charts */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Waste Collection Trend" subtitle="Daily tonnage · last 14 days">
          <TrendChart area days={14} />
        </SectionCard>
        <SectionCard title="Zone Collection Efficiency" subtitle="Collection rate by municipal zone">
          <ZoneBarChart metric="collection_rate_pct" />
        </SectionCard>
      </div>
    </div>
  );
}
