import { createFileRoute } from "@tanstack/react-router";
import { CircleDashed, Leaf, PackageOpen, Recycle, Trash2, TriangleAlert } from "lucide-react";
import { KPICard, PageHeader, SectionCard, ProgressMeter } from "@/components/dashboard/shared";
import { TrendChart, WasteDonut, ZoneBarChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useKPIs, useWasteCategories } from "@/hooks/use-api-data";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";

export const Route = createFileRoute("/waste")({
  head: () => ({
    meta: [
      { title: "Waste Monitoring — SWCM" },
      { name: "description", content: "Track municipal waste tonnage, categories, zones, and vehicle capacity utilization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: cats } = useWasteCategories();
  const { vehicles } = useLiveVehicles();

  const waste  = kpis?.waste;
  const totalT = Number(waste?.waste_today ?? 0);

  // Derive category totals from waste categories (in tons)
  const organic     = cats?.find((c) => c.name === "Organic");
  const recyclable  = cats?.find((c) => c.name === "Recyclable");
  const plastic     = cats?.find((c) => c.name === "Plastic");
  const wet         = totalT * 0.59;   // approximated until worker-app data arrives
  const uncollected = Number(waste?.missed_today ?? 0) * 0.2;  // ~0.2 T per missed stop

  return (
    <div className="space-y-5">
      <PageHeader
        title="Waste Monitoring"
        description="Collection volume, waste composition and fleet capacity utilisation"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpisLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <KPICard
              label="Total Waste Today"
              value={totalT > 0 ? `${totalT.toFixed(1)} T` : "—"}
              detail="From weighbridge records"
              icon={Recycle}
            />
            <KPICard
              label="Organic Waste"
              value={organic?.value ? `${organic.value.toFixed(1)} T` : "—"}
              detail={organic ? `${organic.percent ?? 0}% of total` : "No data yet"}
              icon={Leaf}
            />
            <KPICard
              label="Recyclable Waste"
              value={recyclable?.value ? `${recyclable.value.toFixed(1)} T` : "—"}
              detail={recyclable ? `${recyclable.percent ?? 0}% of total` : "No data yet"}
              icon={CircleDashed}
              tone="info"
            />
            <KPICard
              label="Plastic Waste"
              value={plastic?.value ? `${plastic.value.toFixed(1)} T` : "—"}
              detail={plastic ? `${plastic.percent ?? 0}% of total` : "No data yet"}
              icon={PackageOpen}
              tone="warning"
            />
            <KPICard
              label="Wet Waste (est.)"
              value={wet > 0 ? `${wet.toFixed(1)} T` : "—"}
              detail="~59% of total"
              icon={Trash2}
            />
            <KPICard
              label="Est. Uncollected"
              value={uncollected > 0 ? `${uncollected.toFixed(1)} T` : "0 T"}
              detail={`${waste?.missed_today ?? 0} missed stops`}
              icon={TriangleAlert}
              tone="destructive"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Waste Collected by Day" subtitle="Last 30 days">
          <TrendChart area days={30} />
        </SectionCard>
        <SectionCard title="Waste by Category">
          <WasteDonut />
        </SectionCard>
        <SectionCard title="Daily Waste by Zone">
          <ZoneBarChart metric="daily_waste_ton" />
        </SectionCard>
        <SectionCard title="Vehicle Capacity Utilisation">
          <div className="space-y-3">
            {vehicles.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
              ))
            ) : (
              vehicles
                .filter((v) => v.status === "Collecting" || v.status === "Active")
                .slice(0, 10)
                .map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[100px_minmax(0,1fr)_64px] items-center gap-3 text-xs"
                  >
                    <span className="font-semibold">{v.id}</span>
                    <ProgressMeter
                      value={v.load}
                      tone={v.load > 90 ? "destructive" : v.load > 75 ? "warning" : "primary"}
                    />
                    <span className="text-right text-muted-foreground">
                      {(v.capacity * v.load / 100).toFixed(1)} T
                    </span>
                  </div>
                ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
