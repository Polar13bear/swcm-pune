import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, Fuel, Gauge, IndianRupee, Truck, Users } from "lucide-react";
import { KPICard, PageHeader, SectionCard } from "@/components/dashboard/shared";
import { TrendChart, ZoneBarChart } from "@/components/charts/operations-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useKPIs, useHistory } from "@/hooks/use-api-data";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";
import { formatINR } from "@/data/mock-data";

export const Route = createFileRoute("/cost-fuel")({
  head: () => ({
    meta: [
      { title: "Cost & Fuel Analytics — SWCM" },
      { name: "description", content: "Analyze municipal fleet fuel, maintenance, driver costs, and operating efficiency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: kpis, isLoading } = useKPIs();
  const { data: history } = useHistory(30);
  const { vehicles } = useLiveVehicles();

  const fleet = kpis?.fleet;
  const waste = kpis?.waste;

  // Aggregate today's cost from history (last row)
  const todayHistory = history?.[history.length - 1];
  const totalCost    = Number(todayHistory?.cost ?? 0);
  const totalFuel    = Number(todayHistory?.fuel ?? 0);
  const totalDist    = Number(todayHistory?.distance ?? 0);
  const wasteT       = Number(waste?.waste_today ?? 0);
  const costPerKm    = totalDist > 0 ? (totalCost / totalDist).toFixed(2) : "—";
  const costPerTon   = wasteT > 0   ? Math.round(totalCost / wasteT)     : 0;

  // Approximate cost breakdown (real breakdown requires fuel logs + driver payroll)
  const fuelCost   = totalFuel * 100;   // ₹100/L estimate
  const driverCost = totalCost * 0.20;
  const maintCost  = totalCost * 0.10;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cost & Fuel Analytics"
        description="Operating expenditure, fuel efficiency and cost accountability"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <KPICard label="Total Operating Cost"  value={totalCost  > 0 ? formatINR(totalCost)  : "—"} detail="Today" icon={CircleDollarSign} />
            <KPICard label="Fuel Cost"             value={fuelCost   > 0 ? formatINR(fuelCost)   : "—"} detail={totalCost > 0 ? `${((fuelCost / totalCost) * 100).toFixed(1)}% of cost` : "No data"} icon={Fuel} tone="warning" />
            <KPICard label="Maintenance Cost"      value={maintCost  > 0 ? formatINR(maintCost)  : "—"} detail="10% of cost (est.)" icon={Truck} tone="destructive" />
            <KPICard label="Driver Cost"           value={driverCost > 0 ? formatINR(driverCost) : "—"} detail="20% of cost (est.)" icon={Users} tone="info" />
            <KPICard label="Cost per Kilometer"    value={costPerKm !== "—" ? `₹${costPerKm}` : "—"}    detail={`${totalDist.toFixed(0)} km today`} icon={Gauge} />
            <KPICard label="Cost per Ton"          value={costPerTon > 0 ? formatINR(costPerTon) : "—"} detail={`${wasteT.toFixed(1)} tons collected`} icon={IndianRupee} tone="info" />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Daily Operating Cost" subtitle="30-day expenditure trend">
          <TrendChart kind="cost" area days={30} />
        </SectionCard>
        <SectionCard title="Fuel Consumption" subtitle="Litres consumed per day">
          <TrendChart kind="fuel" area days={30} />
        </SectionCard>
        <SectionCard title="Cost by Zone">
          <ZoneBarChart metric="daily_cost_inr" />
        </SectionCard>
        <SectionCard title="Fuel Efficiency — Active Vehicles">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-y bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  {["Vehicle", "Type", "Zone", "Speed km/h", "Fuel %", "Load %", "Mileage km/L"].map(
                    (x) => <th className="px-2 py-3" key={x}>{x}</th>,
                  )}
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Loading vehicle data…
                    </td>
                  </tr>
                ) : (
                  vehicles
                    .filter((v) => v.status !== "Offline" && v.status !== "Maintenance")
                    .slice(0, 10)
                    .map((v) => (
                      <tr className="border-b" key={v.id}>
                        <td className="px-2 py-3 font-bold">{v.id}</td>
                        <td className="px-2">{v.type}</td>
                        <td className="px-2">{v.zone}</td>
                        <td className="px-2">{v.speed}</td>
                        <td className="px-2">{v.fuel}%</td>
                        <td className="px-2">{v.load}%</td>
                        <td className="px-2">{v.mileage}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
