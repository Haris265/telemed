"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { Badge, Button, Card, IconButton, PageHeader, Skeleton } from "@/components/ui";

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [item, setItem] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .appointment(id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  async function onDelete() {
    if (!item) return;
    if (!window.confirm(`Delete appointment ${item.token_code}?`)) return;
    try {
      await api.deleteAppointment(item.id);
      router.push("/admin/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/appointments">
          <Button variant="secondary" className="px-3 py-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        {item ? (
          <IconButton tone="danger" title="Delete" onClick={onDelete}>
            <Trash2 size={15} strokeWidth={1.75} />
          </IconButton>
        ) : null}
      </div>

      <PageHeader
        title={item ? item.token_code : "Appointment detail"}
        subtitle="Full booking details for this queue token."
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
      ) : item ? (
        <>
          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-lg font-bold text-sky-200">
                {item.token_code}
              </span>
              <Badge
                tone={
                  item.status === "completed"
                    ? "success"
                    : item.status === "cancelled"
                      ? "danger"
                      : "info"
                }
              >
                {item.status}
              </Badge>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Patient</p>
                <p className="mt-1 font-medium text-slate-100">{item.patient_name}</p>
                <p className="text-sm text-slate-400">{item.patient_phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Doctor</p>
                <p className="mt-1 font-medium text-slate-100">Dr. {item.doctor_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Appointment date</p>
                <p className="mt-1 font-medium text-slate-100">{formatDate(item.token_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Scheduled at</p>
                <p className="mt-1 font-medium text-slate-100">{formatWhen(item.scheduled_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Booked at</p>
                <p className="mt-1 font-medium text-slate-100">{formatWhen(item.created_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Last updated</p>
                <p className="mt-1 font-medium text-slate-100">{formatWhen(item.updated_at)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-sky-200">Notes</h2>
            <p className="text-sm text-slate-300">{item.notes?.trim() || "No notes."}</p>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/patients`}>
              <Button variant="secondary">Patients</Button>
            </Link>
            <Link href="/admin/appointments">
              <Button variant="secondary">All appointments</Button>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
