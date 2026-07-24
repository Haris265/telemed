"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  PaginationBar,
  Select,
  Skeleton,
} from "@/components/ui";

const PAGE_SIZE = 10;

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      };
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;
      if (todayOnly) params.today = "1";
      const data = await api.appointments(params);
      const list = unwrapList(data);
      const count = unwrapCount(data);
      if (!list.length && nextPage > 1 && count > 0) {
        await load(nextPage - 1);
        return;
      }
      setItems(list);
      setTotal(count);
      setPage(nextPage);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayOnly, status]);

  async function onDelete(item: Appointment) {
    if (
      !window.confirm(
        `Delete appointment ${item.token_code} for ${item.patient_name}?`,
      )
    ) {
      return;
    }
    try {
      await api.deleteAppointment(item.id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Appointments"
        subtitle="Queue tokens booked via WhatsApp — newest bookings first."
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Input
          placeholder="Search patient, phone, doctor"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button
          variant={todayOnly ? "primary" : "secondary"}
          onClick={() => setTodayOnly((v) => !v)}
        >
          {todayOnly ? "Today" : "All dates"}
        </Button>
        <Button variant="secondary" onClick={() => load(1)}>
          Search
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : !items.length ? (
          <div className="p-5">
            <EmptyState
              title="No appointments"
              description="Tokens booked from WhatsApp will appear here."
            />
          </div>
        ) : (
          <>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Token</th>
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Doctor</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-sm font-bold text-sky-200">
                        {a.token_code}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-100">{a.patient_name}</p>
                      <p className="text-xs text-slate-400">{a.patient_phone}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-200">Dr. {a.doctor_name}</td>
                    <td className="px-5 py-3 text-slate-300">{formatDate(a.token_date)}</td>
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
                      <div className="flex items-center gap-1.5">
                        <Link href={`/admin/appointments/${a.id}`}>
                          <IconButton tone="edit" title="View detail">
                            <Eye size={15} strokeWidth={1.75} />
                          </IconButton>
                        </Link>
                        <IconButton tone="danger" title="Delete" onClick={() => onDelete(a)}>
                          <Trash2 size={15} strokeWidth={1.75} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => load(p)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
