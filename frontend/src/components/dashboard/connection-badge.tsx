/**
 * Shows the current data source: live WebSocket, REST poll, or local mock.
 */
import { cn } from "@/lib/utils";

type ConnectionState = "connecting" | "connected" | "fallback" | "mock";

const labels: Record<ConnectionState, string> = {
  connecting: "Connecting…",
  connected:  "Live",
  fallback:   "REST",
  mock:       "Demo",
};

const colors: Record<ConnectionState, string> = {
  connecting: "bg-warning/80 text-warning-foreground",
  connected:  "bg-success/80 text-success-foreground",
  fallback:   "bg-info/80   text-info-foreground",
  mock:       "bg-muted      text-muted-foreground",
};

const dotColors: Record<ConnectionState, string> = {
  connecting: "bg-warning   animate-ping",
  connected:  "bg-success   live-pulse",
  fallback:   "bg-info",
  mock:       "bg-muted-foreground",
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <span
      className={cn(
        "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium xl:flex",
        colors[state],
      )}
      title={`Data source: ${labels[state]}`}
    >
      <span className={cn("size-1.5 rounded-full", dotColors[state])} />
      {labels[state]}
    </span>
  );
}
