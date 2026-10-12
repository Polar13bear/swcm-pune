/**
 * Chart components — all data from API hooks (no mock data).
 */
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { useHistory, useZones, useWasteCategories } from "@/hooks/use-api-data";
import { Skeleton } from "@/components/ui/skeleton";

const grid = "var(--border)";
const muted = "var(--muted-foreground)";
const tip = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)" },
};

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-md" />;
}

// ---- Trend Chart ----
export function TrendChart({
  kind = "waste",
  area = false,
  days = 14,
}: {
  kind?: "waste" | "fuel" | "cost" | "utilization" | "efficiency";
  area?: boolean;
  days?: number;
}) {
  const { data, isLoading } = useHistory(days);
  if (isLoading || !data) return <ChartSkeleton />;

  const color =
    kind === "cost"        ? "var(--chart-4)" :
    kind === "fuel"        ? "var(--chart-2)" :
    kind === "efficiency"  ? "var(--chart-3)" :
    kind === "utilization" ? "var(--chart-5)" :
    "var(--chart-1)";

  // Format labels
  const chartData = data.map((row) => ({
    ...row,
    // Shorten date label: "2026-10-01" → "01 Oct"
    date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} />
          <Area
            type="monotone"
            dataKey={kind}
            stroke={color}
            strokeWidth={2.5}
            fill={area ? `url(#fill-${kind})` : "transparent"}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Multi-line trend (utilization + efficiency) ----
export function MultiTrendChart({ days = 14 }: { days?: number }) {
  const { data, isLoading } = useHistory(days);
  if (isLoading || !data) return <ChartSkeleton />;

  const chartData = data.map((row) => ({
    ...row,
    date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: muted }} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: muted }} axisLine={false} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="utilization" name="Fleet utilization %" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="efficiency"  name="Collection efficiency %" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Zone bar chart ----
export function ZoneBarChart({
  metric = "collection_rate_pct",
}: {
  metric?: "collection_rate_pct" | "daily_waste_ton" | "daily_cost_inr" | "active_vehicles";
}) {
  const { data, isLoading } = useZones();
  if (isLoading || !data) return <ChartSkeleton />;

  const chartData = data.map((z) => ({
    id:   z.code,
    name: z.name,
    [metric]: z[metric] ?? 0,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ left: -10, right: 5, top: 8 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="id" tick={{ fontSize: 10, fill: muted }} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: muted }} axisLine={false} />
          <Tooltip {...tip} />
          <Bar dataKey={metric} fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Waste donut (live today) ----
export function WasteDonut() {
  const { data, isLoading } = useWasteCategories();
  if (isLoading || !data || data.length === 0) return <ChartSkeleton />;

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
          >
            {data.map((x) => (
              <Cell key={x.name} fill={x.fill} />
            ))}
          </Pie>
          <Tooltip {...tip} formatter={(v) => [`${Number(v).toFixed(1)} T`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
