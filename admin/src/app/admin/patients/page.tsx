"use client";

import { useEffect, useState } from "react";

import { api, unwrapList } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui";

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(search = q) {
    setLoading(true);
    try {
      const data = await api.patients(search);
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Patients"
        subtitle="WhatsApp-onboarded patient profiles across the network."
      />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search name or phone"
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
              title="No patients yet"
              description="Patients appear here after WhatsApp onboarding."
            />
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Verified</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-slate-700/70 hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-slate-300">{p.phone}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.is_verified ? "success" : "warning"}>
                      {p.is_verified ? "Verified" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
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
