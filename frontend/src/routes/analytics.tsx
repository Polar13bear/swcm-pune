import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Gauge, Recycle, Route as RouteIcon, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard, PageHeader, SectionCard } from "@/components/dashboard/shared";
import { MultiTrendChart, TrendChart, ZoneBarChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useKPIs, useHistory } from "@/hooks/use-api-data";

const DAY_OPTIONS: Record<string, number> = {
  "Today":      1,
  "7 Days":     7,
  "30 Days":    30,
  "3 Months":   90,
};

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Reports — SWCM" },
      { name: "description", content: "Municipal fleet utilization, collection efficiency, route, fuel, cost, and zone reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [range, setRange] = useState("30 Days");
  const days = DAY_OPTIONS[range] ?? 30;

  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: history } = useHistory(days);

  const fleet = kpis?.fleet;
  const waste = kpis?.waste;

  // Compute simple trend vs prior period
  const wasteThisPeriod  = history?.slice(-Math.ceil(days / 2)).reduce((s, r) => s + Number(r.waste), 0) ?? 0;
  const wastePriorPeriod = history?.slice(0, Math.ceil(days / 2)).reduce((s, r) => s + Number(r.waste), 0) ?? 1;
  const wasteTrend = ((wasteThisPeriod - wastePriorPeriod) / wastePriorPeriod * 100).toFixed(1);

  const exportCsv = () => {
    if (!history) return;
    const csv = [
      "Date,Waste (T),Organic (T),Recyclable (T),Fuel (L),Cost (INR),Utilization %,Efficiency %,Distance (km),Missed",
      ...history.map((r) =>
        [r.date, r.waste, r.organic, r.recyclable, r.fuel, r.cost,
         r.utilization, r.efficiency, r.distance, r.missed].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `swcm-analytics-${range.replace(" ", "-").toLowerCase()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics & Reports"
        description="Operational performance, trends and decision-ready municipal reporting"
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!history}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {Object.keys(DAY_OPTIONS).map((x) => (
          <Button key={x} size="sm" variant={range === x ? "default" : "ghost"} onClick={() => setRange(x)}>
            {x}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <KPICard
              label="Fleet Utilization"
              value={fleet ? `${((fleet.on_route / (fleet.total_vehicles || 1)) * 100).toFixed(1)}%` : "—"}
              detail={`${fleet?.on_route ?? "—"} of ${fleet?.total_vehicles ?? "—"} vehicles`}
              trend={`+${((fleet?.on_route ?? 0) / (fleet?.total_vehicles || 1) * 100 - 84).toFixed(1)}%`}
              icon={Truck}
            />
            <KPICard
              label="Collection Efficiency"
              value={waste?.avg_collection_rate ? `${Number(waste.avg_collection_rate).toFixed(1)}%` : "—"}
              detail="Across all zones"
              icon={Recycle}
            />
            <KPICard
              label="Waste This Period"
              value={wasteThisPeriod > 0 ? `${wasteThisPeriod.toFixed(1)} T` : "—"}
              detail={`${days}-day total`}
              trend={`${Number(wasteTrend) >= 0 ? "+" : ""}${wasteTrend}%`}
              icon={RouteIcon}
              tone="info"
            />
            <KPICard
              label="Avg. Speed"
              value={fleet?.avg_speed ? `${fleet.avg_speed} km/h` : "—"}
              detail="Active vehicles"
              icon={Gauge}
              tone="warning"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Fleet Utilization & Collection Efficiency">
          <MultiTrendChart days={days} />
        </SectionCard>
        <SectionCard title="Waste Collection Trend">
          <TrendChart area days={days} />
        </SectionCard>
        <SectionCard title="Fuel Consumption Trend">
          <TrendChart kind="fuel" area days={days} />
        </SectionCard>
        <SectionCard title="Cost Trend">
          <TrendChart kind="cost" area days={days} />
        </SectionCard>
        <SectionCard title="Collection Efficiency Trend">
          <TrendChart kind="efficiency" area days={days} />
        </SectionCard>
        <SectionCard title="Zone Performance Comparison">
          <ZoneBarChart metric="collection_rate_pct" />
        </SectionCard>
      </div>
    </div>
  );
}
