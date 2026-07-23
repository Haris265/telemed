"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, unwrapList } from "@/lib/api";
import type { Doctor } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui";

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(search = q) {
    setLoading(true);
    try {
      const data = await api.doctors(search ? { q: search } : {});
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

  async function toggle(doctor: Doctor) {
    await api.updateDoctor(doctor.id, { is_active: !doctor.is_active });
    await load();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Doctors Directory"
        subtitle="All onboarded clinicians across specialities."
        action={
          <Link href="/admin/doctors/onboarding">
            <Button>Onboard Doctor</Button>
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
        <Button variant="secondary" onClick={() => load()}>
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
                    <Button variant="secondary" onClick={() => toggle(d)}>
                      {d.is_active ? "Deactivate" : "Activate"}
                    </Button>
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
