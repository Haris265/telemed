"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Speciality } from "@/lib/types";
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

export default function SpecialitiesPage() {
  const [items, setItems] = useState<Speciality[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editing, setEditing] = useState<Speciality | null>(null);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await api.specialities({
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      });
      const list = unwrapList(data);
      const count = unwrapCount(data);
      // If page is empty after delete, step back
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
    setName("");
    setIconUrl("");
    setOpen(true);
  }

  function openEdit(item: Speciality) {
    setMode("edit");
    setEditing(item);
    setName(item.name);
    setIconUrl(item.icon_url || "");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setName("");
    setIconUrl("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        await api.createSpeciality({ name, icon_url: iconUrl, is_active: true });
        closeModal();
        await load(1);
      } else if (editing) {
        await api.updateSpeciality(editing.id, { name, icon_url: iconUrl });
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

  async function toggleActive(item: Speciality) {
    try {
      await api.updateSpeciality(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDelete(item: Speciality) {
    if (!window.confirm(`Delete speciality "${item.name}"?`)) return;
    try {
      await api.deleteSpeciality(item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Specialities"
        subtitle="Manage clinical specialities available during doctor onboarding."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add New
          </Button>
        }
      />
      {error ? (
        <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
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
              title="No specialities yet"
              description="Add Cardiology, Dermatology, and other specialities to start onboarding doctors."
            />
          </div>
        ) : (
          <>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Icon</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium text-slate-100">{item.name}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {item.display_icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.display_icon} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      "—"
                    )}
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
        title={mode === "create" ? "Add Speciality" : "Edit Speciality"}
        onClose={closeModal}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cardiology"
            required
          />
          <Input
            label="Icon URL"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://..."
          />
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
