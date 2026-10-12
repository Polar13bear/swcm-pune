/**
 * Redirects unauthenticated users to /login.
 * Wraps the entire app shell.
 */
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });

  useEffect(() => {
    if (!user && path !== "/login") {
      void navigate({ to: "/login" });
    }
  }, [user, path, navigate]);

  if (!user && path !== "/login") return null;
  return <>{children}</>;
}
