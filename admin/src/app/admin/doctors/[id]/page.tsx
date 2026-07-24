"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api, unwrapList } from "@/lib/api";
import type { Doctor, DoctorAvailability } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";

function formatClock(value: string) {
  // "09:00:00" or "09:00"
  const [h, m] = value.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m || 0), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function DoctorDetailPage() {
  const params = useParams();
  const uuid = String(params.id || "");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uuid) return;
    setLoading(true);
    Promise.all([api.doctor(uuid), api.doctorAvailability(uuid)])
      .then(([doc, avail]) => {
        setDoctor(doc);
        setSlots(unwrapList(avail));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [uuid]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/doctors">
          <Button variant="secondary" className="px-3 py-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title={doctor ? `Dr. ${doctor.full_name}` : "Doctor detail"}
        subtitle="Weekly availability schedule for this clinician."
      />

      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-48" />
        </div>
      ) : doctor ? (
        <>
          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 font-medium text-slate-100">{doctor.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Session</p>
                <p className="mt-1 font-medium text-slate-100">{doctor.session_time} min</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Subscription</p>
                <div className="mt-1">
                  <Badge
                    tone={
                      doctor.subscription_status === "subscribed"
                        ? "success"
                        : doctor.subscription_status === "expired"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {doctor.subscription_status === "subscribed"
                      ? "Subscribed"
                      : doctor.subscription_status === "expired"
                        ? "Expired"
                        : "No subscription"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge tone={doctor.is_active ? "success" : "neutral"}>
                    {doctor.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Specialities</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {doctor.specialities.map((s) => (
                    <Badge key={s.id} tone="info">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/70 px-5 py-3">
              <h2 className="text-sm font-semibold text-sky-200">Availability</h2>
              <p className="text-xs text-slate-400">Weekly clinic hours</p>
            </div>
            {!slots.length ? (
              <div className="p-5">
                <EmptyState
                  title="No availability set"
                  description="This doctor has no weekly schedule configured yet."
                />
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Day</th>
                    <th className="px-5 py-3 font-medium">Start</th>
                    <th className="px-5 py-3 font-medium">End</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id} className="border-t border-slate-700/70">
                      <td className="px-5 py-3 font-medium text-slate-100">
                        {slot.weekday_display}
                      </td>
                      <td className="px-5 py-3 text-slate-300">{formatClock(slot.start_time)}</td>
                      <td className="px-5 py-3 text-slate-300">{formatClock(slot.end_time)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={slot.is_active ? "success" : "neutral"}>
                          {slot.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
