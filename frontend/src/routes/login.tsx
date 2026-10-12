import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Eye, EyeOff, Loader2, Recycle, CheckCircle2,
  XCircle, User, Mail, Lock, BadgeCheck, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, type RegisterFields } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

// ── Shared left panel ────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[460px] shrink-0 flex-col justify-between bg-sidebar p-10 text-sidebar-foreground">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-sidebar-active">
            <Recycle className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg">SWCM</div>
            <div className="text-xs text-sidebar-muted">Smart Waste Collection Management</div>
          </div>
        </div>
        <div className="mt-12">
          <h1 className="text-3xl font-bold leading-snug">
            Pune Municipal<br />Corporation
          </h1>
          <p className="mt-4 text-sm text-sidebar-muted leading-relaxed">
            Real-time fleet monitoring, route optimisation, and waste collection intelligence across 10 zones.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {[
            ["128", "Active Vehicles"],
            ["10",  "Zones Covered"],
            ["50+", "Drivers"],
            ["~400T","Daily Waste"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg bg-sidebar-foreground/5 p-4">
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-xs text-sidebar-muted mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-sidebar-muted">
        © 2026 Pune Municipal Corporation · SWCM Platform
      </div>
    </div>
  );
}

// ── Password strength checker ────────────────────────────────────────
const PWD_RULES = [
  { label: "At least 8 characters",             test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)",         test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number (0–9)",                  test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#$ etc.)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = PWD_RULES.filter(r => r.test(password)).length;
  const pct    = (passed / PWD_RULES.length) * 100;
  const color  = pct <= 25 ? "bg-destructive" : pct <= 50 ? "bg-warning" : pct <= 75 ? "bg-yellow-400" : "bg-success";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {PWD_RULES.map(r => (
          <div key={r.label} className={cn("flex items-center gap-1 text-[10px]", r.test(password) ? "text-success" : "text-muted-foreground")}>
            {r.test(password)
              ? <CheckCircle2 className="size-3 shrink-0" />
              : <XCircle      className="size-3 shrink-0" />}
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SIGN IN form ─────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { role: "Admin",      email: "admin@pmc.gov.in",       password: "Admin@1234"   },
  { role: "Supervisor", email: "sup.central@pmc.gov.in", password: "Sup@Central1" },
  { role: "Operator",   email: "ops@pmc.gov.in",         password: "Ops@1234"     },
  { role: "Driver",     email: "driver1@pmc.gov.in",     password: "Driver@1234"  },
];
const ROLE_PILL: Record<string, string> = {
  Admin:      "bg-purple-100 text-purple-700 border-purple-200",
  Supervisor: "bg-blue-100   text-blue-700   border-blue-200",
  Operator:   "bg-green-100  text-green-700  border-green-200",
  Driver:     "bg-orange-100 text-orange-700 border-orange-200",
};

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email,   setEmail]   = useState("");
  const [pwd,     setPwd]     = useState("");
  const [show,    setShow]    = useState(false);
  const [error,   setError]   = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, pwd);
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <h2 className="text-2xl font-bold">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your PMC account</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label className="text-sm font-medium">Email address</label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@pmc.gov.in" autoComplete="email" className="pl-9" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" className="pl-9 pr-10" required />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide" : "Show"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-primary hover:underline">
          Create one
        </button>
      </p>

      {/* Demo accounts */}
      <div className="mt-8 border-t pt-6">
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
          Demo accounts — click to fill
        </p>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map(acc => (
            <button key={acc.role} type="button"
              onClick={() => { setEmail(acc.email); setPwd(acc.password); setError(""); }}
              className="w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-xs hover:bg-muted/50 transition-colors">
              <span className="font-medium">{acc.email}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", ROLE_PILL[acc.role] ?? "")}>
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SIGN UP form ─────────────────────────────────────────────────────
const ROLES = ["Operator", "Driver", "Supervisor", "Admin"] as const;

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [empId,      setEmpId]      = useState("");
  const [role,       setRole]       = useState<string>("Operator");
  const [pwd,        setPwd]        = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  const pwdMatch = confirm === "" || pwd === confirm;
  const allRulesPassed = PWD_RULES.every(r => r.test(pwd));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!allRulesPassed) { setError("Password does not meet requirements"); return; }
    if (pwd !== confirm)  { setError("Passwords do not match"); return; }

    const fields: RegisterFields = { name, email, password: pwd, role, ...(empId ? { employeeId: empId } : {}) };
    try {
      await register(fields);
      setSuccess(true);
      setTimeout(() => void navigate({ to: "/" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-[400px] text-center py-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Account created!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <h2 className="text-2xl font-bold">Create account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Register your PMC employee account</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {/* Full name */}
        <div>
          <label className="text-sm font-medium">Full name <span className="text-destructive">*</span></label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="Rajesh Patil" autoComplete="name" className="pl-9" required />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium">Email address <span className="text-destructive">*</span></label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@pmc.gov.in" autoComplete="email" className="pl-9" required />
          </div>
        </div>

        {/* Employee ID + Role — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Employee ID</label>
            <div className="relative mt-1">
              <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={empId} onChange={e => setEmpId(e.target.value)}
                placeholder="EMP-0001" className="pl-9" />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Auto-assigned if blank</p>
          </div>
          <div>
            <label className="text-sm font-medium">Role <span className="text-destructive">*</span></label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <select value={role} onChange={e => setRole(e.target.value)}
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-medium">Password <span className="text-destructive">*</span></label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input type={showPwd ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="Min. 8 characters" autoComplete="new-password" className="pl-9 pr-10" required />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <PasswordStrength password={pwd} />
        </div>

        {/* Confirm password */}
        <div>
          <label className="text-sm font-medium">Confirm password <span className="text-destructive">*</span></label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input type={showConf ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password" autoComplete="new-password"
              className={cn("pl-9 pr-10", confirm && !pwdMatch && "border-destructive focus-visible:ring-destructive")} required />
            <button type="button" onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {confirm && !pwdMatch && (
            <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading || !pwdMatch || !allRulesPassed}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-primary hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}

// ── Main page — toggles between Sign In and Sign Up ──────────────────
function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="flex min-h-screen bg-background">
      <LeftPanel />

      <div className="flex flex-1 flex-col items-center justify-center p-6 overflow-y-auto">
        {/* Mobile logo */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div className="grid size-10 place-items-center rounded-lg bg-primary">
            <Recycle className="size-5 text-primary-foreground" />
          </div>
          <div className="font-bold text-lg">SWCM · PMC</div>
        </div>

        {/* Tab switcher */}
        <div className="mb-8 flex rounded-lg border bg-muted p-1 w-full max-w-[400px]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              mode === "signin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-all",
              mode === "signup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Create account
          </button>
        </div>

        {mode === "signin"
          ? <SignInForm onSwitch={() => setMode("signup")} />
          : <SignUpForm onSwitch={() => setMode("signin")} />
        }
      </div>
    </div>
  );
}
