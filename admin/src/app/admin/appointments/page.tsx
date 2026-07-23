"use client";

import { useEffect, useState } from "react";

import { api, unwrapList } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton } from "@/components/ui";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextStatus = status) {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (nextStatus) params.status = nextStatus;
      const data = await api.appointments(params);
      setItems(unwrapList(data));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setApptStatus(id: number, next: string) {
    await api.updateAppointment(id, { status: next });
    await load();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Appointments"
        subtitle="Monitor and update appointment status across the clinic."
      />

      <div className="mb-4 flex max-w-xs gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : !items.length ? (
          <div className="p-5">
            <EmptyState
              title="No appointments found"
              description="Appointments created via admin API or future booking flows will list here."
            />
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium">{a.patient_name}</p>
                    <p className="text-xs text-slate-400">{a.patient_phone}</p>
                  </td>
                  <td className="px-5 py-3">Dr. {a.doctor_name}</td>
                  <td className="px-5 py-3 text-slate-300">{formatWhen(a.scheduled_at)}</td>
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
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {a.status === "upcoming" ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setApptStatus(a.id, "completed")}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setApptStatus(a.id, "cancelled")}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
