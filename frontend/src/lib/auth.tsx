/**
 * Auth context — JWT stored in localStorage.
 * Provides useAuth() hook to every component.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { BASE } from "./api.js";

export type UserRole = "Admin" | "Supervisor" | "Operator" | "Driver";

export type AuthUser = {
  userId: number;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  zoneId: number | null;
  zoneName: string | null;
  driverId: number | null;
  vehicleId: number | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fields: RegisterFields) => Promise<void>;
  logout: () => void;
  can: (action: Permission) => boolean;
};

export type RegisterFields = {
  name: string;
  email: string;
  password: string;
  role: string;
  employeeId?: string;
  zoneId?: number;
};

// ── Permission definitions ────────────────────────────────────────────
export type Permission =
  | "view:all_zones"
  | "view:analytics"
  | "view:cost_fuel"
  | "view:drivers"
  | "view:settings"
  | "view:route_optimization"
  | "edit:vehicles"
  | "edit:drivers"
  | "edit:routes"
  | "resolve:alerts"
  | "acknowledge:alerts"
  | "run:optimization"
  | "export:reports";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [
    "view:all_zones","view:analytics","view:cost_fuel","view:drivers","view:settings",
    "view:route_optimization","edit:vehicles","edit:drivers","edit:routes",
    "resolve:alerts","acknowledge:alerts","run:optimization","export:reports",
  ],
  Supervisor: [
    "view:all_zones","view:analytics","view:cost_fuel","view:route_optimization",
    "resolve:alerts","acknowledge:alerts","run:optimization","export:reports",
  ],
  Operator: [
    "view:all_zones","view:analytics","view:cost_fuel",
    "acknowledge:alerts","export:reports",
  ],
  Driver: [],
};

const TOKEN_KEY = "swcm_token";
const USER_KEY  = "swcm_user";

// Safe localStorage accessors — no-ops during SSR
function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
function getStoredUser(): AuthUser | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
function setStoredToken(t: string | null) {
  if (typeof localStorage === "undefined") return;
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
}
function setStoredUser(u: AuthUser | null) {
  if (typeof localStorage === "undefined") return;
  u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY);
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,     setToken]     = useState<string | null>(() => getStoredToken());
  const [user,      setUser]      = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStoredToken(token);
    if (!token) setStoredUser(null);
  }, [token]);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error ?? "Login failed");
      }
      const { token: t, user: u } = await res.json() as { token: string; user: AuthUser };
      setToken(t);
      setUser(u);
      setStoredUser(u);
    } finally {
      setIsLoading(false);
    }
  }

  async function register(fields: RegisterFields) {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error ?? "Registration failed");
      }
      const { token: t, user: u } = await res.json() as { token: string; user: AuthUser };
      setToken(t);
      setUser(u);
      setStoredUser(u);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  function can(action: Permission): boolean {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(action) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
