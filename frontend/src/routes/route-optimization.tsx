import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, Calendar, Clock, CircleDollarSign, Fuel, Route as RouteIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FleetMap } from "@/components/maps/fleet-map";
import { PageHeader, SectionCard, StatusBadge } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";
import { useRoutes, useKPIs } from "@/hooks/use-api-data";

export const Route = createFileRoute("/route-optimization")({
  head: () => ({
    meta: [
      { title: "AI Route Optimisation — SWCM" },
      { name: "description", content: "Compare and optimise municipal routes for distance, time, fuel cost, and collection efficiency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type RouteRow = Record<string, unknown>;

function Page() {
  const { vehicles } = useLiveVehicles();
  const { data: routes, isLoading } = useRoutes();
  const { data: kpis } = useKPIs();

  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]!,
  );

  const routeStats = kpis?.routes;

  const run = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1400);
  };

  function str(v: unknown) { return v != null ? String(v) : "—"; }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Route Optimisation"
        description="Plan efficient collection routes using fleet capacity, traffic and zone demand"
        meta={
          <div className="mt-2 flex items-center gap-2 text-xs text-primary">
            <Sparkles className="size-3.5" /> Decision-support simulation
          </div>
        }
      />

      <SectionCard>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold">
            Select Date
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block h-9 w-full rounded-md border bg-background px-3 font-normal"
            />
          </label>
          {[
            ["Select Zone",              ["All Zones", "ZONE-01", "ZONE-04", "ZONE-05"]],
            ["Select Vehicles",          ["Recommended", "Compactors only", "Electric fleet"]],
            ["Optimisation Objective",   ["Balanced Optimisation", "Minimum Distance", "Minimum Fuel Cost", "Minimum Time", "Max Collection Efficiency"]],
          ].map(([l, o]) => (
            <label key={l as string} className="text-xs font-semibold">
              {l}
              <select className="mt-1 block h-9 w-full rounded-md border bg-background px-3 font-normal">
                {(o as string[]).map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          ))}
          <div className="flex items-end">
            <Button className="w-full" onClick={run} disabled={loading}>
              <BrainCircuit />
              {loading ? "Optimising…" : "Optimise Routes"}
            </Button>
          </div>
        </div>
      </SectionCard>

      {done && (
        <div className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <strong>Optimisation complete.</strong> {routeStats?.total_routes ?? 24} vehicle routes recalculated
          with an estimated ₹13,800 daily saving. Connect the Valhalla/VROOM engine for real results.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <SectionCard
          title="Route Map"
          subtitle="Current vehicle positions across Pune municipal limits"
        >
          <FleetMap vehicles={vehicles.slice(0, 9)} optimized={done} height="h-[500px]" />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Before / After Comparison">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs font-bold">Current Route</div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div><dt className="text-muted-foreground">Planned stops</dt><dd className="font-bold">{routeStats?.stops_done ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Active routes</dt><dd className="font-bold">{routeStats?.total_routes ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Delayed</dt><dd className="font-bold">{routeStats?.delayed ?? "—"}</dd></div>
                </dl>
              </div>
              <div className="rounded-md border border-success/30 bg-success/5 p-3">
                <div className="text-xs font-bold text-success">Optimised Route</div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div><dt className="text-muted-foreground">Distance</dt><dd className="font-bold text-success">1,012 km (est.)</dd></div>
                  <div><dt className="text-muted-foreground">Estimated Cost</dt><dd className="font-bold text-success">₹48,600</dd></div>
                  <div><dt className="text-muted-foreground">Est. Time</dt><dd className="font-bold text-success">8h 05m</dd></div>
                </dl>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Estimated Savings">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  [RouteIcon, "272 km", "Distance saved"],
                  [Fuel, "91 L", "Fuel saved"],
                  [CircleDollarSign, "₹13,800", "Cost saved"],
                  [Clock, "1h 37m", "Time saved"],
                ] as [React.FC<{ className?: string }>, string, string][]
              ).map(([Icon, value, label]) => (
                <div key={label} className="rounded-md border p-3">
                  <Icon className="size-4 text-primary" />
                  <div className="mt-2 text-lg font-bold">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Today's Routes" subtitle={`${routes?.length ?? 0} routes loaded from database`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-y bg-muted/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                {["Route", "Vehicle", "Driver", "Zone", "Stops", "Completed", "Distance", "Fuel (L)", "Waste (T)", "Status"].map(
                  (x) => <th className="px-3 py-3" key={x}>{x}</th>,
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="py-6 text-center text-muted-foreground">Loading routes…</td></tr>
              ) : (routes as RouteRow[])?.slice(0, 15).map((r, i) => (
                <tr className="border-b" key={str(r["id"]) + i}>
                  <td className="px-3 py-3 font-bold">{str(r["route_code"])}</td>
                  <td className="px-3">{str(r["vehicle_code"])}</td>
                  <td className="px-3">{str(r["driver_name"])}</td>
                  <td className="px-3">{str(r["zone_name"])}</td>
                  <td className="px-3">{str(r["planned_stops"])}</td>
                  <td className="px-3">{str(r["completed_stops"])}</td>
                  <td className="px-3">{r["actual_km"] ? `${Number(r["actual_km"]).toFixed(1)} km` : str(r["planned_km"]) + " km"}</td>
                  <td className="px-3">{r["fuel_used_l"] ? `${Number(r["fuel_used_l"]).toFixed(1)}` : "—"}</td>
                  <td className="px-3">{r["waste_collected_ton"] ? `${Number(r["waste_collected_ton"]).toFixed(2)}` : "—"}</td>
                  <td className="px-3"><StatusBadge status={str(r["status"])} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
