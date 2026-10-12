import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type UserRole = "Admin" | "Supervisor" | "Operator" | "Driver";

export type JwtPayload = {
  userId: number;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  zoneId: number | null;
  driverId: number | null;
  vehicleId: number | null;
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Verify JWT and attach user to request. Returns 401 if missing/invalid. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];
  const token  = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Require one of the specified roles. Call after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}

/** Supervisors can only see their own zone. Admins/Operators see all. */
export function enforceZoneScope(req: Request, res: Response, next: NextFunction) {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  // Inject zone filter for Supervisors
  if (req.user.role === "Supervisor" && req.user.zoneId) {
    (req as Request & { zoneFilter?: number }).zoneFilter = req.user.zoneId;
  }
  next();
}
