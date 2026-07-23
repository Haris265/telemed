"use client";

import { FormEvent, useEffect, useState } from "react";

import { api, unwrapList } from "@/lib/api";
import type { Speciality } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Skeleton,
} from "@/components/ui";

export default function SpecialitiesPage() {
  const [items, setItems] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.specialities();
      setItems(unwrapList(data));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createSpeciality({ name, icon_url: iconUrl, is_active: true });
      setOpen(false);
      setName("");
      setIconUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Speciality) {
    await api.updateSpeciality(item.id, { is_active: !item.is_active });
    await load();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Specialities"
        subtitle="Manage clinical specialities available during doctor onboarding."
        action={<Button onClick={() => setOpen(true)}>Add New</Button>}
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
                    <Button variant="secondary" onClick={() => toggleActive(item)}>
                      {item.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} title="Add Speciality" onClose={() => setOpen(false)}>
        <form onSubmit={onCreate} className="space-y-4">
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
