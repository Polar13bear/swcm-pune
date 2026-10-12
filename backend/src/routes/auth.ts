import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";
import { config } from "../config.js";
import { requireAuth, type JwtPayload } from "../middleware/auth.js";

const router = Router();

// ---- POST /api/auth/login ----
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const { rows } = await query(
      `SELECT u.*, z.name AS zone_name
       FROM users u
       LEFT JOIN zones z ON z.id = u.zone_id
       WHERE u.email = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [email.toLowerCase().trim()],
    );

    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user["password_hash"] as string);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Update last login
    await query("UPDATE users SET last_login=NOW() WHERE id=$1", [user["id"]]);

    const payload: JwtPayload = {
      userId:     user["id"] as number,
      employeeId: user["employee_id"] as string,
      name:       user["name"] as string,
      email:      user["email"] as string,
      role:       user["role"] as JwtPayload["role"],
      zoneId:     user["zone_id"] as number | null,
      driverId:   user["driver_id"] as number | null,
      vehicleId:  user["vehicle_id"] as number | null,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    });

    res.json({
      token,
      user: {
        ...payload,
        zoneName: user["zone_name"] ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ---- POST /api/auth/register ----
router.post("/register", async (req, res) => {
  const { name, email, password, role, employeeId, zoneId } =
    req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      employeeId?: string;
      zoneId?: number;
    };

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  // Password strength: min 8 chars, 1 uppercase, 1 number, 1 special char
  const pwdStrong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  if (!pwdStrong) {
    res.status(400).json({
      error: "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
    });
    return;
  }

  // Only allow valid roles; default to Operator
  const validRoles = ["Admin", "Supervisor", "Operator", "Driver"];
  const safeRole   = validRoles.includes(role ?? "") ? role! : "Operator";

  try {
    // Check if email already exists
    const { rows: existing } = await query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase().trim()],
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    // Auto-generate employee ID if not provided
    const { rows: countRows } = await query("SELECT COUNT(*) AS c FROM users");
    const count = parseInt((countRows[0] as { c: string }).c, 10) + 1;
    const autoEmployeeId = employeeId?.trim() || `EMP-${String(count).padStart(4, "0")}`;

    const { rows } = await query<{
      id: number; employee_id: string; name: string;
      email: string; role: string; zone_id: number | null;
    }>(
      `INSERT INTO users (employee_id, name, email, password_hash, role, zone_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, employee_id, name, email, role, zone_id`,
      [autoEmployeeId, name.trim(), email.toLowerCase().trim(),
       hash, safeRole, zoneId ?? null],
    );

    const newUser = rows[0]!;

    // Issue token immediately so user is logged in after register
    const payload: JwtPayload = {
      userId:     newUser.id,
      employeeId: newUser.employee_id,
      name:       newUser.name,
      email:      newUser.email,
      role:       newUser.role as JwtPayload["role"],
      zoneId:     newUser.zone_id,
      driverId:   null,
      vehicleId:  null,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    });

    res.status(201).json({ token, user: { ...payload, zoneName: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});


router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---- POST /api/auth/logout ---- (client just discards token)
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
