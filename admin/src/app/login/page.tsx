"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Lock, ShieldCheck, Sparkles, Stethoscope, User } from "lucide-react";

import { login } from "@/lib/api";

const particles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  style: {
    width: `${4 + (i % 5) * 3}px`,
    height: `${4 + (i % 5) * 3}px`,
    left: `${8 + ((i * 7.5) % 85)}%`,
    bottom: `${5 + ((i * 11) % 40)}%`,
    background:
      i % 3 === 0
        ? "rgba(56,189,248,0.65)"
        : i % 3 === 1
          ? "rgba(96,165,250,0.55)"
          : "rgba(147,197,253,0.45)",
    animationDuration: `${4 + ((i * 1.3) % 5)}s`,
    animationDelay: `${(i * 0.6) % 4}s`,
  } as React.CSSProperties,
}));

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="premium-page-bg relative flex h-screen overflow-hidden">
      <div className="mesh-grid-bg pointer-events-none absolute inset-0" />

      {/* Left brand panel */}
      <div
        className="premium-card relative m-4 hidden h-[calc(100%-2rem)] w-[52%] flex-col overflow-hidden rounded-3xl lg:flex"
        style={{
          background: "linear-gradient(155deg, #0f1c2e 0%, #132744 45%, #0a1220 100%)",
        }}
      >
        <div className="animate-rotate-ring pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-400/15" />
        <div className="animate-rotate-ring-rev pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent-400/15" />
        <div
          className="glow-pulse pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(37,99,175,0.4), transparent 70%)" }}
        />
        <div
          className="glow-pulse pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.28), transparent 70%)",
            animationDelay: "1.8s",
          }}
        />

        {particles.map((p) => (
          <div key={p.id} className="particle" style={p.style} />
        ))}

        <div className="animate-slide-in-left relative z-10 shrink-0 p-8">
          <div className="premium-chip mb-4 inline-flex items-center gap-2 rounded-full border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-sky-100">
            <Sparkles size={13} className="text-sky-400" />
            Hospital Operations Platform
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Telemed</h1>
          <p className="mt-1 text-sm text-slate-300">Clinic Admin Portal</p>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6">
          <div
            className="flex h-56 w-56 items-center justify-center rounded-3xl border border-sky-400/20"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(37,99,175,0.5), rgba(10,18,32,0.92))",
              boxShadow:
                "0 0 0 1px rgba(56,189,248,0.18), 0 40px 80px -20px rgba(0,0,0,0.85), 0 20px 40px -10px rgba(37,99,175,0.3)",
            }}
          >
            <Stethoscope size={88} className="text-sky-200" strokeWidth={1.25} />
          </div>
        </div>

        <div className="animate-slide-in-left stagger-3 relative z-10 shrink-0 p-8">
          <div className="mb-3 h-px bg-gradient-to-r from-brand-400/70 via-accent-400/50 to-transparent" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-300">
            Centralized clinic operations — doctors, specialities, patients, and appointments in one
            secure portal.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-sky-400" />
            JWT-secured · Role-based access · Live WhatsApp intake
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,175,1) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,175,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="glow-pulse pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(37,99,175,0.12), transparent 70%)" }}
        />

        <div className="premium-card premium-card-glow shine-border animate-slide-in-right relative z-10 w-full max-w-[400px] rounded-3xl p-8">
          <div className="mb-7 animate-fade-in-up">
            <div
              className="premium-chip mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{
                background: "linear-gradient(145deg, #3b82f6 0%, #1e4b8c 100%)",
                boxShadow: "0 8px 20px -4px rgba(30,75,140,0.65)",
              }}
            >
              <Lock size={22} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--premium-text)]">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--premium-muted-text)]">
              Sign in to manage your clinic operations
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="animate-fade-in-up stagger-1">
              <label className="mb-1.5 block text-xs font-medium text-[var(--premium-label)]">
                Username
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--premium-label)]"
                />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused("user")}
                  onBlur={() => setFocused(null)}
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm focus:outline-none"
                  style={{
                    background: "var(--premium-field-bg)",
                    color: "var(--premium-field-text)",
                    borderColor:
                      focused === "user" ? "rgba(37,99,175,0.65)" : "var(--premium-border)",
                    boxShadow:
                      focused === "user"
                        ? "0 0 0 3px rgba(37,99,175,0.14), inset 0 1px 2px rgba(0,0,0,0.06)"
                        : "inset 0 1px 2px rgba(0,0,0,0.06)",
                  }}
                />
              </div>
            </div>

            <div className="animate-fade-in-up stagger-2">
              <label className="mb-1.5 block text-xs font-medium text-[var(--premium-label)]">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--premium-label)]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm focus:outline-none"
                  style={{
                    background: "var(--premium-field-bg)",
                    color: "var(--premium-field-text)",
                    borderColor:
                      focused === "pass" ? "rgba(37,99,175,0.65)" : "var(--premium-border)",
                    boxShadow:
                      focused === "pass"
                        ? "0 0 0 3px rgba(37,99,175,0.14), inset 0 1px 2px rgba(0,0,0,0.06)"
                        : "inset 0 1px 2px rgba(0,0,0,0.06)",
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <div className="animate-fade-in-up stagger-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="press-btn shine-hover relative w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{
                  background: "linear-gradient(145deg, #3b82f6 0%, #1e4b8c 55%, #15345f 100%)",
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.14) inset, 0 8px 24px -6px rgba(30,75,140,0.55)",
                }}
              >
                <span className="relative">{loading ? "Signing in…" : "Sign in"}</span>
              </button>
            </div>
          </form>

          <div className="mt-6 flex animate-fade-in-up stagger-4 items-center gap-3">
            <div className="h-px flex-1 bg-[var(--premium-divider)]" />
            <div className="flex items-center gap-1.5 text-xs text-[var(--premium-muted-text)]">
              <Activity size={12} className="text-sky-500" />
              Secured · Audited · Admin only
            </div>
            <div className="h-px flex-1 bg-[var(--premium-divider)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
