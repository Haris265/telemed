"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, PowerOff, Plus, Trash2 } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Doctor, DoctorSubscription } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  PaginationBar,
  Select,
  Skeleton,
} from "@/components/ui";

const PAGE_SIZE = 10;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plusMonthsISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<DoctorSubscription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [doctorId, setDoctorId] = useState("");
  const [amount, setAmount] = useState("5000");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusMonthsISO(1));
  const [notes, setNotes] = useState("");

  async function load(search = q, nextPage = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      };
      if (search) params.q = search;
      const data = await api.subscriptions(params);
      const list = unwrapList(data);
      const count = unwrapCount(data);
      if (!list.length && nextPage > 1 && count > 0) {
        await load(search, nextPage - 1);
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
    load("", 1);
    api
      .doctors({ page_size: "200" })
      .then((data) => setDoctors(unwrapList(data)))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unsubscribedActive = useMemo(
    () => doctors.filter((d) => d.is_active && !d.has_active_subscription),
    [doctors],
  );

  function closeModal() {
    setOpen(false);
    setDoctorId("");
    setAmount("5000");
    setStartDate(todayISO());
    setEndDate(plusMonthsISO(1));
    setNotes("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!doctorId) {
      setError("Select a doctor.");
      return;
    }
    setSaving(true);
    try {
      await api.createSubscription({
        doctor: Number(doctorId),
        amount,
        start_date: startDate,
        end_date: endDate,
        payment_method: "cash",
        notes,
      });
      closeModal();
      const refreshed = await api.doctors({ page_size: "200" });
      setDoctors(unwrapList(refreshed));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(sub: DoctorSubscription) {
    if (
      !window.confirm(
        `Delete cash subscription for Dr. ${sub.doctor_name} (${sub.start_date} → ${sub.end_date})?`,
      )
    ) {
      return;
    }
    try {
      await api.deleteSubscription(sub.uuid);
      const refreshed = await api.doctors({ page_size: "200" });
      setDoctors(unwrapList(refreshed));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function deactivateUnsubscribed() {
    if (
      !window.confirm(
        `Deactivate ${unsubscribedActive.length || "all"} active doctor(s) without a valid subscription?`,
      )
    ) {
      return;
    }
    setDeactivating(true);
    try {
      const result = await api.deactivateUnsubscribedDoctors();
      const refreshed = await api.doctors({ page_size: "200" });
      setDoctors(unwrapList(refreshed));
      setError("");
      window.alert(`Deactivated ${result.deactivated_count} doctor(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subscriptions"
        subtitle="Cash subscriptions for doctors. Without an active plan, doctors can be marked inactive."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={deactivateUnsubscribed}
              disabled={deactivating}
            >
              <PowerOff size={16} />
              {deactivating
                ? "Deactivating…"
                : `Inactive without sub${unsubscribedActive.length ? ` (${unsubscribedActive.length})` : ""}`}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              Add cash subscription
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by doctor name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1);
            load(q, 1);
          }}
        >
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
          </div>
        ) : !items.length ? (
          <div className="p-5">
            <EmptyState
              title="No subscriptions yet"
              description="Record a cash payment to activate a doctor’s subscription period."
            />
          </div>
        ) : (
          <>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Doctor</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium">Dr. {s.doctor_name}</p>
                      <p className="text-xs text-slate-400">{s.doctor_email}</p>
                    </td>
                    <td className="px-5 py-3">Rs {s.amount}</td>
                    <td className="px-5 py-3">
                      <Badge tone="info">
                        <span className="inline-flex items-center gap-1">
                          <CreditCard size={12} />
                          Cash
                        </span>
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {s.start_date} → {s.end_date}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={
                          s.is_currently_valid
                            ? "success"
                            : s.is_active
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {s.is_currently_valid
                          ? "Valid"
                          : s.is_active
                            ? "Expired"
                            : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <IconButton
                        tone="danger"
                        title="Delete subscription"
                        onClick={() => onDelete(s)}
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => load(q, p)}
            />
          </>
        )}
      </Card>

      <Modal open={open} title="Add cash subscription" onClose={closeModal}>
        <form onSubmit={onCreate} className="space-y-4">
          <Select
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            required
          >
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name}
                {d.has_active_subscription ? " (subscribed)" : " (no active sub)"}
              </option>
            ))}
          </Select>

          <Input
            label="Amount (Rs)"
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received at clinic desk"
          />

          <p className="text-xs text-slate-400">Payment method is fixed to Cash.</p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save subscription"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
