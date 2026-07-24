"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Doctors",
      value: stats?.total_doctors,
      icon: Stethoscope,
      gradient: "from-blue-500 to-blue-700",
      href: "/admin/doctors",
    },
    {
      label: "Total Patients",
      value: stats?.total_patients,
      icon: Users,
      gradient: "from-sky-400 to-sky-600",
      href: "/admin/patients",
    },
    {
      label: "Total Appointments",
      value: stats?.total_appointments,
      icon: CalendarDays,
      gradient: "from-cyan-500 to-teal-600",
      href: null as string | null,
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      <Card className="relative overflow-hidden p-6 md:p-7">
        <div className="mesh-grid-bg pointer-events-none absolute inset-0 opacity-50" />
        <div
          className="pointer-events-none absolute right-10 top-4 h-36 w-36 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.28), transparent 70%)" }}
        />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="premium-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <Sparkles size={13} className="text-sky-300" />
              Live clinic overview
            </div>
            <h1 className="text-2xl font-bold text-slate-50 md:text-3xl">Operations Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Track doctors, WhatsApp patients, and appointments across your Telemed network.
            </p>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {loading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
          : cards.map((card, i) => {
              const Icon = card.icon;
              const body = (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-50">{card.value ?? 0}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b ${card.gradient} text-white depth-raised`}
                  >
                    <Icon size={20} className="text-white" strokeWidth={2.25} />
                  </div>
                </div>
              );
              const className = `premium-card premium-hover-lift animate-fade-in-up stagger-${i + 1} block rounded-3xl p-5 no-underline`;
              return card.href ? (
                <Link key={card.label} href={card.href} className={className}>
                  {body}
                </Link>
              ) : (
                <div key={card.label} className={className}>
                  {body}
                </div>
              );
            })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-50">Today&apos;s upcoming</h2>
          {loading ? (
            <Skeleton className="h-40" />
          ) : !stats?.upcoming_today?.length ? (
            <EmptyState
              title="No appointments today"
              description="Upcoming appointments scheduled for today will appear here."
            />
          ) : (
            <div className="space-y-3">
              {stats.upcoming_today.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-600/50 bg-slate-900/40 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{a.patient_name}</p>
                    <p className="text-xs text-slate-400">
                      Dr. {a.doctor_name} · {formatWhen(a.scheduled_at)}
                    </p>
                  </div>
                  <Badge tone="info">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-50">Recent activity</h2>
          {loading ? (
            <Skeleton className="h-40" />
          ) : !stats?.recent_appointments?.length ? (
            <EmptyState
              title="No recent appointments"
              description="Newly created appointments will show up in this feed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium">Doctor</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_appointments.map((a) => (
                    <tr key={a.id} className="border-t border-slate-700/70">
                      <td className="py-2.5 font-medium text-slate-100">{a.patient_name}</td>
                      <td className="py-2.5 text-slate-400">Dr. {a.doctor_name}</td>
                      <td className="py-2.5">
                        <Badge
                          tone={
                            a.status === "completed"
                              ? "success"
                              : a.status === "cancelled"
                                ? "danger"
                                : "info"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
