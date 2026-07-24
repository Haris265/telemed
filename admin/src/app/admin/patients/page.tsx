"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";

import { api, unwrapCount, unwrapList } from "@/lib/api";
import type { Patient } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  PaginationBar,
  Skeleton,
} from "@/components/ui";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(search = q, nextPage = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      };
      if (search.trim()) params.q = search.trim();
      const data = await api.patients(params);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(patient: Patient) {
    if (
      !window.confirm(
        `Delete patient "${patient.name}"? Their appointments will also be removed.`,
      )
    ) {
      return;
    }
    try {
      await api.deletePatient(patient.uuid);
      await load(q, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Patients"
        subtitle="WhatsApp-onboarded patient profiles — newest first."
      />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search name or phone"
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
              title="No patients yet"
              description="Patients appear here after WhatsApp onboarding."
            />
          </div>
        ) : (
          <>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Verified</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/admin/patients/${p.uuid}`}>
                          <IconButton tone="edit" title="View bookings">
                            <Eye size={15} strokeWidth={1.75} />
                          </IconButton>
                        </Link>
                        <IconButton
                          tone="danger"
                          title="Delete"
                          onClick={() => onDelete(p)}
                        >
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
    </div>
  );
}
