import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle, BarChart3, Bell, ChevronDown, CircleDollarSign,
  Gauge, LogOut, Map, MapPinned, Menu, PanelLeftClose, PanelLeftOpen,
  Recycle, Route as RouteIcon, Search, Settings, Truck, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-api-data";
import { useAuth, type Permission } from "@/lib/auth";

const links: Array<[string, string, React.FC<{ className?: string }>, Permission | null]> = [
  ["/",                  "Dashboard",            Gauge,           null],
  ["/tracking",          "Live Vehicle Tracking", Map,            null],
  ["/vehicles",          "Vehicles",             Truck,           null],
  ["/route-optimization","Route Optimization",   RouteIcon,       "view:route_optimization"],
  ["/zones",             "Collection Zones",     MapPinned,       null],
  ["/waste",             "Waste Monitoring",     Recycle,         null],
  ["/cost-fuel",         "Cost & Fuel",          CircleDollarSign,"view:cost_fuel"],
  ["/analytics",         "Analytics & Reports",  BarChart3,       "view:analytics"],
  ["/alerts",            "Alerts",               AlertTriangle,   null],
  ["/drivers",           "Drivers",              Users,           "view:drivers"],
  ["/settings",          "Settings",             Settings,        "view:settings"],
];

const ROLE_BADGE: Record<string, string> = {
  Admin:      "bg-purple-100 text-purple-700",
  Supervisor: "bg-blue-100   text-blue-700",
  Operator:   "bg-green-100  text-green-700",
  Driver:     "bg-orange-100 text-orange-700",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]       = useState(false);
  const [mobile, setMobile]             = useState(false);
  const [now, setNow]                   = useState(new Date());
  const [notifications, setNotifications] = useState(false);

  const path  = useRouterState({ select: (s) => s.location.pathname });
  const title = links.find(([p]) => (p === "/" ? path === "/" : path.startsWith(p)))?.[1] ?? "Vehicle Details";

  const { data: openAlerts } = useAlerts("Open");
  const alertCount = openAlerts?.length ?? 0;
  const topAlerts  = openAlerts?.slice(0, 4) ?? [];

  // Filter nav links by role permissions
  const visibleLinks = links.filter(([,, , permission]) =>
    !permission || can(permission),
  );

  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(i);
  }, []);

  function handleLogout() {
    logout();
    void navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
          collapsed ? "w-[76px]" : "w-[248px]",
          mobile ? "translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-foreground/10 px-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-sidebar-active font-bold text-primary-foreground">
            SW
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold">SWCM</div>
              <div className="truncate text-[10px] text-sidebar-muted">Smart Waste Management</div>
            </div>
          )}
          <Button
            size="icon" variant="ghost"
            onClick={() => setMobile(false)}
            className="ml-auto text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleLinks.map(([to, label, Icon]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobile(false)}
              activeOptions={{ exact: to === "/" }}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-active text-primary-foreground shadow-sm" }}
              title={collapsed ? label : undefined}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-foreground/10 p-3">
          {!collapsed && user && (
            <div className="mb-3 rounded-md bg-sidebar-foreground/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{user.name}</div>
                  <div className="mt-0.5 truncate text-[10px] text-sidebar-muted">{user.email}</div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold", ROLE_BADGE[user.role] ?? "bg-muted text-muted-foreground")}>
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <div className={cn("flex gap-1", collapsed ? "flex-col" : "")}>
            <Button
              variant="ghost" size="sm"
              onClick={() => setCollapsed((v) => !v)}
              className="flex-1 text-sidebar-muted hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            >
              {collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /><span>Collapse</span></>}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleLogout}
              className="text-sidebar-muted hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
              {!collapsed && <span>Sign out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {mobile && (
        <button
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]")}>
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="hidden min-w-0 lg:block">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-success">
              <span className="size-1.5 rounded-full bg-success live-pulse" />
              System Status: Operational
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="bg-muted/60 pl-9 shadow-none" placeholder="Search vehicle, driver, zone…" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden text-right xl:block">
              <div className="text-xs font-medium">
                {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Notification bell */}
            <Button
              size="icon" variant="ghost"
              onClick={() => setNotifications((v) => !v)}
              className="relative"
              aria-label={`Notifications (${alertCount} open)`}
            >
              <Bell />
              {alertCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              )}
            </Button>
            <Button variant="ghost" className="hidden gap-2 md:flex">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "MC"}
              </span>
              <span className="hidden text-xs xl:block">{user?.name ?? "Pune Municipal Corp."}</span>
              <ChevronDown className="size-3" />
            </Button>
          </div>

          {/* Notification dropdown */}
          {notifications && (
            <div className="absolute right-4 top-14 w-[min(360px,calc(100vw-32px))] rounded-md border bg-popover p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm font-semibold">Notifications</span>
                {alertCount > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {alertCount}
                  </span>
                )}
              </div>
              {topAlerts.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">No open alerts</p>
              ) : (
                topAlerts.map((a) => (
                  <Link
                    key={a.id}
                    to="/alerts"
                    onClick={() => setNotifications(false)}
                    className="block rounded-md px-2 py-2 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium">{a.subject}</div>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        a.severity === "Critical"   ? "bg-destructive/15 text-destructive"  :
                        a.severity === "Warning"    ? "bg-warning/15 text-warning"           :
                        "bg-info/15 text-info",
                      )}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {a.description}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </header>

        <main className="mx-auto max-w-[1640px] p-4 pb-20 sm:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card lg:hidden">
        {links.slice(0, 5).map(([to, label, Icon]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[9px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate px-1">
              {label.replace("Live Vehicle ", "").replace("Route ", "")}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
