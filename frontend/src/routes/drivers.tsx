import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Phone, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard, SearchBox, StatusBadge, ProgressMeter } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrivers } from "@/hooks/use-api-data";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Driver Management — SWCM" },
      { name: "description", content: "Manage municipal waste fleet drivers, shifts, assignments, and safety performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type DriverRow = Record<string, unknown>;

function Page() {
  const { data: drivers, isLoading } = useDrivers();
  const [q, setQ]           = useState("");
  const [selected, setSelected] = useState<DriverRow | null>(null);

  const rows = (drivers ?? []).filter((d) =>
    (String(d["employee_id"] ?? "") + String(d["name"] ?? "") + String(d["vehicle_code"] ?? "") + String(d["zone_name"] ?? ""))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  function str(v: unknown) { return v != null ? String(v) : "—"; }

  return (
    <div className="space-y-5">
      <PageHeader title="Drivers" description="Driver assignments, shifts, safety and operational performance" />

      <SectionCard>
        <div className="max-w-md">
          <SearchBox value={q} onChange={setQ} placeholder="Search driver, vehicle or zone" />
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-y bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  {["ID", "Name", "Vehicle", "Zone", "Shift", "Trips", "Distance", "Safety Score", "Status", "Profile"].map(
                    (x) => <th className="px-3 py-3" key={x}>{x}</th>,
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((d, i) => (
                  <tr key={str(d["id"]) + i} className="border-b">
                    <td className="px-3 py-3 font-bold">{str(d["employee_id"])}</td>
                    <td className="px-3 font-semibold">{str(d["name"])}</td>
                    <td className="px-3">{str(d["vehicle_code"] ?? d["plate_number"])}</td>
                    <td className="px-3">{str(d["zone_name"])}</td>
                    <td className="px-3">{str(d["shift"])}</td>
                    <td className="px-3">{str(d["trips_today"] ?? "0")}</td>
                    <td className="px-3">{str(d["distance_today"] ?? "0")} km</td>
                    <td className="px-3">
                      <ProgressMeter value={Number(d["safety_score"] ?? 80)} />
                    </td>
                    <td className="px-3">
                      <StatusBadge status={str(d["vehicle_status"] ?? "On duty")} />
                    </td>
                    <td className="px-3">
                      <Button size="icon" variant="ghost" onClick={() => setSelected(d)}>
                        <Eye />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No drivers found</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Driver profile modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-foreground/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {str(selected["name"]).split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-lg font-bold">{str(selected["name"])}</div>
                <div className="text-xs text-muted-foreground">
                  {str(selected["employee_id"])} · {str(selected["experience_yrs"])} years experience
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              {(
                [
                  [Phone,       str(selected["phone"]),                     "Phone"],
                  [Truck,       str(selected["vehicle_code"] ?? "—"),        "Assigned vehicle"],
                  [ShieldCheck, `${str(selected["safety_score"] ?? "—")}%`, "Safety score"],
                  [Truck,       `${str(selected["trips_today"] ?? "0")} trips · ${str(selected["distance_today"] ?? "0")} km`, "Today"],
                ] as [React.FC<{ className?: string }>, string, string][]
              ).map(([Icon, value, label]) => (
                <div key={label} className="rounded-md border p-3">
                  <Icon className="size-4 text-primary" />
                  <div className="mt-2 font-bold">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" onClick={() => setSelected(null)}>
              Close profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
