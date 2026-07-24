"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Power, PowerOff, Trash2, UserPlus } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Doctor, Speciality } from "@/lib/types";
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
  Skeleton,
} from "@/components/ui";

const PAGE_SIZE = 10;

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sessionTime, setSessionTime] = useState(15);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  async function load(search = q, nextPage = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      };
      if (search) params.q = search;
      const data = await api.doctors(params);
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
      .specialities({ page_size: "100" })
      .then((data) => setSpecialities(unwrapList(data).filter((s) => s.is_active)))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(doctor: Doctor) {
    setEditing(doctor);
    setFirstName(doctor.first_name);
    setLastName(doctor.last_name);
    setSessionTime(doctor.session_time);
    setSelected(doctor.specialities.map((s) => s.id));
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setFirstName("");
    setLastName("");
    setSessionTime(15);
    setSelected([]);
  }

  function toggleSpeciality(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!selected.length) {
      setError("Select at least one speciality.");
      return;
    }
    setSaving(true);
    try {
      await api.updateDoctor(editing.uuid, {
        first_name: firstName,
        last_name: lastName,
        session_time: sessionTime,
        speciality_ids: selected,
      });
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(doctor: Doctor) {
    try {
      await api.updateDoctor(doctor.uuid, { is_active: !doctor.is_active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDelete(doctor: Doctor) {
    if (!window.confirm(`Delete Dr. ${doctor.full_name}? This removes their login too.`)) {
      return;
    }
    try {
      await api.deleteDoctor(doctor.uuid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const specialityOptions = (() => {
    const byId = new Map(specialities.map((s) => [s.id, s]));
    if (editing) {
      for (const s of editing.specialities) {
        if (!byId.has(s.id)) byId.set(s.id, s);
      }
    }
    return Array.from(byId.values());
  })();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Doctors Directory"
        subtitle="All onboarded clinicians across specialities."
        action={
          <Link href="/admin/doctors/onboarding">
            <Button>
              <UserPlus size={16} />
              Onboard Doctor
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by name or email"
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
              title="No doctors onboarded"
              description="Use Doctor Onboarding to register the first clinician."
            />
          </div>
        ) : (
          <>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">Specialities</th>
                <th className="px-5 py-3 font-medium">Session</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium">Dr. {d.full_name}</p>
                    <p className="text-xs text-slate-400">{d.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {d.specialities.map((s) => (
                        <Badge key={s.id} tone="info">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">{d.session_time} min</td>
                  <td className="px-5 py-3">
                    <Badge tone={d.is_active ? "success" : "neutral"}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/doctors/${d.uuid}`}>
                        <IconButton tone="edit" title="View availability">
                          <Eye size={15} strokeWidth={1.75} />
                        </IconButton>
                      </Link>
                      <IconButton tone="edit" title="Edit" onClick={() => openEdit(d)}>
                        <Pencil size={15} strokeWidth={1.75} />
                      </IconButton>
                      <IconButton
                        tone={d.is_active ? "warning" : "success"}
                        title={d.is_active ? "Deactivate" : "Activate"}
                        onClick={() => toggle(d)}
                      >
                        {d.is_active ? (
                          <PowerOff size={15} strokeWidth={1.75} />
                        ) : (
                          <Power size={15} strokeWidth={1.75} />
                        )}
                      </IconButton>
                      <IconButton tone="danger" title="Delete" onClick={() => onDelete(d)}>
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
            onPageChange={(p) => load(q, p)}
          />
          </>
        )}
      </Card>

      <Modal open={open} title="Edit Doctor" onClose={closeModal}>
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sky-200">Specialities</p>
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
              {specialityOptions.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpeciality(s.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                        : "border-slate-600 hover:border-sky-400/40"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Session Time (minutes)"
            type="number"
            min={5}
            max={240}
            value={sessionTime}
            onChange={(e) => setSessionTime(Number(e.target.value))}
            required
          />

          {editing ? (
            <p className="text-xs text-slate-400">Login email: {editing.email}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
