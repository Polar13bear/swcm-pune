import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox, StatusBadge, ProgressMeter, EmptyState } from "./shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";
import { formatINR } from "@/data/mock-data";
import type { Vehicle } from "@/data/mock-data";

export function VehicleTable() {
  const { vehicles, connection } = useLiveVehicles();
  const [q, setQ]         = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage]   = useState(0);
  const [sort, setSort]   = useState<keyof Vehicle>("id");

  const rows = useMemo(
    () =>
      vehicles
        .filter(
          (v) =>
            (v.id + v.number + v.driver + v.zone + v.type)
              .toLowerCase()
              .includes(q.toLowerCase()) &&
            (status === "All" || v.status === status),
        )
        .sort((a, b) => String(a[sort]).localeCompare(String(b[sort]))),
    [vehicles, q, status, sort],
  );

  const shown = rows.slice(page * 10, page * 10 + 10);

  const exportCsv = () => {
    const csv = [
      "Vehicle ID,Number,Type,Driver,Zone,Status,Fuel %,Load %,Mileage,Speed km/h",
      ...rows.map((v) =>
        [v.id, v.number, v.type, v.driver, v.zone, v.status,
         v.fuel, v.load, v.mileage, v.speed].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "swcm-vehicles.csv";
    a.click();
  };

  if (connection === "connecting" && vehicles.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
        <SearchBox
          value={q}
          onChange={(v) => { setQ(v); setPage(0); }}
          placeholder="Search vehicle, driver, zone…"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option>All</option>
          {["Active","Collecting","Traveling","Idle","Maintenance","Offline","Delayed","Emergency"]
            .map((s) => <option key={s}>{s}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
      </div>

      {/* Data source badge */}
      {connection !== "connected" && (
        <div className="mt-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
          {connection === "fallback"
            ? "REST API — live WebSocket unavailable"
            : connection === "mock"
            ? "Demo mode — start the backend server for live data"
            : "Connecting to live data…"}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="border-y bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              {([
                ["id",              "Vehicle ID"],
                ["number",          "Plate Number"],
                ["type",            "Type"],
                ["driver",          "Driver"],
                ["zone",            "Zone"],
                ["status",          "Status"],
                ["fuel",            "Fuel"],
                ["load",            "Load"],
                ["speed",           "Speed"],
                ["route",           "Route"],
                ["lastMaintenance", "Last Service"],
              ] as [keyof Vehicle, string][]).map(([k, l]) => (
                <th key={k} className="px-3 py-3">
                  <button
                    className="flex items-center gap-1 font-semibold"
                    onClick={() => setSort(k)}
                  >
                    {l} <ArrowUpDown className="size-3" />
                  </button>
                </th>
              ))}
              <th className="px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((v) => (
              <tr key={v.id} className="border-b hover:bg-muted/35">
                <td className="px-3 py-3 font-bold">{v.id}</td>
                <td className="px-3 font-semibold">{v.number}</td>
                <td className="px-3">{v.type}</td>
                <td className="px-3">{v.driver}</td>
                <td className="px-3">{v.zone}</td>
                <td className="px-3"><StatusBadge status={v.status} /></td>
                <td className="px-3"><ProgressMeter value={v.fuel} tone={v.fuel < 20 ? "destructive" : "info"} /></td>
                <td className="px-3"><ProgressMeter value={v.load} tone={v.load > 90 ? "warning" : "primary"} /></td>
                <td className="px-3">{v.speed} km/h</td>
                <td className="px-3">{v.route}</td>
                <td className="px-3">{v.lastMaintenance}</td>
                <td className="px-3">
                  <Button size="icon" variant="ghost" asChild aria-label={`View ${v.id}`}>
                    <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}>
                      <Eye />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <EmptyState />}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {rows.length === 0 ? 0 : page * 10 + 1}–
          {Math.min(page * 10 + 10, rows.length)} of {rows.length}
        </span>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={(page + 1) * 10 >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
