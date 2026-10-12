import { createFileRoute } from "@tanstack/react-router";
import { Home, MapPinned, Recycle, Truck, Users } from "lucide-react";
import { PageHeader, SectionCard, ProgressMeter } from "@/components/dashboard/shared";
import { ZoneBarChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useZones } from "@/hooks/use-api-data";
import { formatINR } from "@/data/mock-data";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Collection Zones — SWCM" },
      { name: "description", content: "Municipal zone collection efficiency, demand, fleet allocation, and missed points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: zones, isLoading } = useZones();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collection Zones"
        description="Coverage, fleet allocation and collection efficiency across Pune Municipal zones"
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <SectionCard title="Zone Efficiency Map" subtitle="Green >90% · Yellow 70–90% · Red <70%">
          <div className="relative h-[430px] overflow-hidden rounded-md border bg-map">
            <div className="absolute inset-0 grid grid-cols-5 grid-rows-2 gap-2 p-5">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-full w-full rounded-md" />
                  ))
                : zones?.map((z) => (
                    <div
                      key={z.id}
                      className={`flex flex-col justify-between rounded-md border p-3 shadow-sm ${
                        (z.collection_rate_pct ?? 0) > 90
                          ? "bg-success/15 border-success/30"
                          : (z.collection_rate_pct ?? 0) >= 70
                          ? "bg-warning/20 border-warning/40"
                          : "bg-destructive/15 border-destructive/30"
                      }`}
                    >
                      <div>
                        <MapPinned className="size-5" />
                        <div className="mt-2 text-xs font-bold">{z.code}</div>
                        <div className="text-[10px] text-muted-foreground">{z.name}</div>
                      </div>
                      <div className="text-xl font-bold">
                        {z.collection_rate_pct != null
                          ? `${Number(z.collection_rate_pct).toFixed(1)}%`
                          : "—"}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Collection Performance">
          <ZoneBarChart metric="collection_rate_pct" />
        </SectionCard>
      </div>

      {/* Zone cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))
          : zones?.map((z) => (
              <article key={z.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{z.code} — {z.name}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {z.delayed_routes ?? 0} delayed routes today
                    </div>
                  </div>
                  <MapPinned className="size-5 text-primary" />
                </div>
                <div className="mt-4">
                  <ProgressMeter
                    value={z.collection_rate_pct ?? 0}
                    tone={
                      (z.collection_rate_pct ?? 0) < 70
                        ? "destructive"
                        : (z.collection_rate_pct ?? 0) < 90
                        ? "warning"
                        : "primary"
                    }
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {(
                    [
                      [Users, z.population?.toLocaleString("en-IN") ?? "—", "Population"],
                      [Home, z.households?.toLocaleString("en-IN") ?? "—", "Households"],
                      [Recycle, z.daily_waste_ton ? `${Number(z.daily_waste_ton).toFixed(1)} T` : "—", "Daily waste"],
                      [Truck, String(z.total_vehicles ?? "—"), "Vehicles"],
                    ] as [React.FC<{ className?: string }>, string, string][]
                  ).map(([Icon, value, label]) => (
                    <div key={label}>
                      <Icon className="size-3.5 text-muted-foreground" />
                      <dd className="mt-1 font-bold">{value}</dd>
                      <dt className="text-[9px] text-muted-foreground">{label}</dt>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 border-t pt-3 text-[10px] text-muted-foreground">
                  {z.active_vehicles ?? "—"} active vehicles ·{" "}
                  {z.daily_cost_inr ? formatINR(Number(z.daily_cost_inr)) : "—"}/day
                </div>
              </article>
            ))}
      </div>
    </div>
  );
}
