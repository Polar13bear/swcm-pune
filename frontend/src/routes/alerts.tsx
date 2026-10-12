import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CheckCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard, StatusBadge } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts, useUpdateAlert } from "@/hooks/use-api-data";
import type { ApiAlert } from "@/lib/api";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Notifications — SWCM" },
      { name: "description", content: "Review and resolve critical municipal fleet, fuel, route, and collection alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [filter, setFilter] = useState("All");
  const { data: alerts, isLoading } = useAlerts();
  const { mutate: updateAlert } = useUpdateAlert();

  const shown = (alerts ?? []).filter(
    (a) => filter === "All" || a.severity === filter,
  );

  const open     = (alerts ?? []).filter((a) => a.status === "Open").length;
  const critical = (alerts ?? []).filter((a) => a.severity === "Critical" && a.status !== "Resolved").length;

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts & Notifications"
        description="Prioritised operational exceptions requiring municipal attention"
        meta={
          <div className="mt-2 text-xs text-muted-foreground">
            {open} open · {critical} critical
          </div>
        }
      />

      <div className="flex gap-1 rounded-md border bg-card p-1">
        {["All", "Critical", "Warning", "Information"].map((x) => (
          <Button
            key={x}
            size="sm"
            variant={filter === x ? "default" : "ghost"}
            onClick={() => setFilter(x)}
          >
            {x}
          </Button>
        ))}
      </div>

      <SectionCard>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No {filter === "All" ? "" : filter.toLowerCase()} alerts
          </p>
        ) : (
          <div className="space-y-2">
            {shown.map((a: ApiAlert) => (
              <article
                key={a.id}
                className="grid gap-3 rounded-md border p-4 md:grid-cols-[130px_minmax(0,1fr)_auto] md:items-center"
              >
                <div>
                  <StatusBadge status={a.severity} />
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {relativeTime(a.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold">{a.subject}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  {a.vehicle_code && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Vehicle: {a.vehicle_code}
                    </div>
                  )}
                  <div className="mt-2">
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="View alert">
                    <Eye />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={a.status !== "Open"}
                    onClick={() => updateAlert({ id: a.id, status: "Acknowledged" })}
                    aria-label="Acknowledge alert"
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    disabled={a.status === "Resolved"}
                    onClick={() => updateAlert({ id: a.id, status: "Resolved", resolved_by: "operator" })}
                    aria-label="Resolve alert"
                  >
                    <CheckCheck />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
