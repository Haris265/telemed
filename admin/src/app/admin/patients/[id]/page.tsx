"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api } from "@/lib/api";
import type { Appointment, PatientDetail } from "@/lib/types";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PatientDetailPage() {
  const params = useParams();
  const uuid = String(params.id || "");
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uuid) return;
    setLoading(true);
    api
      .patient(uuid)
      .then(setPatient)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [uuid]);

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of patient?.appointments || []) {
      const key = a.token_date;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [patient]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/patients">
          <Button variant="secondary" className="px-3 py-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title={patient ? patient.name : "Patient detail"}
        subtitle="Bookings grouped by appointment date."
      />

      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : patient ? (
        <>
          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Phone</p>
                <p className="mt-1 font-medium text-slate-100">{patient.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge tone={patient.is_verified ? "success" : "warning"}>
                    {patient.is_verified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Joined</p>
                <p className="mt-1 font-medium text-slate-100">
                  {new Date(patient.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          {!byDate.length ? (
            <EmptyState
              title="No bookings yet"
              description="When this patient books via WhatsApp, appointments will appear here by date."
            />
          ) : (
            byDate.map(([date, appts]) => (
              <Card key={date} className="overflow-hidden">
                <div className="border-b border-slate-700/70 px-5 py-3">
                  <h2 className="text-sm font-semibold text-sky-200">{formatDate(date)}</h2>
                  <p className="text-xs text-slate-400">{appts.length} booking(s)</p>
                </div>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Token</th>
                      <th className="px-5 py-3 font-medium">Doctor</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Booked at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appts.map((a) => (
                      <tr key={a.id} className="border-t border-slate-700/70">
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-sm font-bold text-sky-200">
                            {a.token_code}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-200">Dr. {a.doctor_name}</td>
                        <td className="px-5 py-3">
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
                        <td className="px-5 py-3 text-slate-400">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
