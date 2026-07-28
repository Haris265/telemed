"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Clinic } from "@/lib/types";
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

type FormMode = "create" | "edit";

const PAGE_SIZE = 10;

const emptyForm = {
  name: "",
  address: "",
  city: "",
  area: "",
  phone: "",
  latitude: "",
  longitude: "",
};

export default function ClinicsPage() {
  const [items, setItems] = useState<Clinic[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await api.clinics({
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      });
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
  }, []);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: Clinic) {
    setMode("edit");
    setEditing(item);
    setForm({
      name: item.name,
      address: item.address,
      city: item.city || "",
      area: item.area || "",
      phone: item.phone || "",
      latitude: String(item.latitude),
      longitude: String(item.longitude),
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        phone: form.phone.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
      };
      if (mode === "create") {
        await api.createClinic({ ...payload, is_active: true });
        closeModal();
        await load(1);
      } else if (editing) {
        await api.updateClinic(editing.id, payload);
        closeModal();
        await load(page);
      } else {
        closeModal();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Clinic) {
    try {
      await api.updateClinic(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDelete(item: Clinic) {
    if (!window.confirm(`Delete clinic "${item.name}"?`)) return;
    try {
      await api.deleteClinic(item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clinics"
        subtitle="Manage clinic locations shown in the patient nearby list."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add New
          </Button>
        }
      />
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
              title="No clinics yet"
              description="Add clinic name, address, and coordinates so patients can find nearby branches."
            />
          </div>
        ) : (
          <>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Area</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Coords</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-700/70 hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-100">{item.name}</div>
                      {item.phone ? (
                        <div className="text-xs text-slate-400">{item.phone}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {item.area || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      <div>{item.address}</div>
                      {item.city ? (
                        <div className="text-xs text-slate-400">{item.city}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {item.latitude}, {item.longitude}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={item.is_active ? "success" : "neutral"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <IconButton tone="edit" title="Edit" onClick={() => openEdit(item)}>
                          <Pencil size={15} strokeWidth={1.75} />
                        </IconButton>
                        <IconButton
                          tone={item.is_active ? "warning" : "success"}
                          title={item.is_active ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(item)}
                        >
                          {item.is_active ? (
                            <PowerOff size={15} strokeWidth={1.75} />
                          ) : (
                            <Power size={15} strokeWidth={1.75} />
                          )}
                        </IconButton>
                        <IconButton tone="danger" title="Delete" onClick={() => onDelete(item)}>
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

      <Modal
        open={open}
        title={mode === "create" ? "Add Clinic" : "Edit Clinic"}
        onClose={closeModal}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Telemed Clifton Care"
            required
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Street / block"
            required
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Karachi"
          />
          <Input
            label="Area / neighbourhood"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            placeholder="e.g. Gulshan, Clifton, DHA"
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="021..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              placeholder="24.813800"
              required
            />
            <Input
              label="Longitude"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              placeholder="67.029900"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
