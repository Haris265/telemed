"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, unwrapList } from "@/lib/api";
import type { Speciality } from "@/lib/types";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sessionTime, setSessionTime] = useState(15);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .specialities({ page_size: "100" })
      .then((data) => setSpecialities(unwrapList(data).filter((s) => s.is_active)))
      .catch((e) => setError(e.message));
  }, []);

  function toggleSpeciality(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected.length) {
      setError("Select at least one speciality.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.onboardDoctor({
        first_name: firstName,
        last_name: lastName,
        speciality_ids: selected,
        session_time: sessionTime,
        email,
        password,
      });
      router.push("/admin/doctors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Doctor Onboarding"
        subtitle="Register a clinician with specialities and consultation session length."
      />

      <Card className="max-w-3xl p-6">
        <form onSubmit={onSubmit} className="space-y-5">
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
            <div className="grid gap-2 sm:grid-cols-2">
              {specialities.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpeciality(s.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
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
            {!specialities.length ? (
              <p className="mt-2 text-sm text-slate-400">
                No active specialities. Create one under Specialities first.
              </p>
            ) : null}
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

          <div className="grid gap-4 border-t border-slate-700 pt-5 sm:grid-cols-2">
            <Input
              label="Login Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Temporary Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Onboarding…" : "Register Doctor"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
