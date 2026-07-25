import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorText, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginNameScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ phone?: string; otp?: string }>();

  const phone = typeof params.phone === "string" ? params.phone : "";
  const otp = typeof params.otp === "string" ? params.otp : "";

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ready = name.trim().length >= 2;

  async function finish() {
    if (!phone || !otp || !ready) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyOtp({
        phone,
        otp,
        name: name.trim(),
      });
      await signIn(res.access, res.refresh, res.patient);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your account");
    } finally {
      setLoading(false);
    }
  }

  if (!phone || !otp) {
    return (
      <AuthShell title="Your name" subtitle="Session expired." showBack>
        <Button label="Start over" onPress={() => router.replace("/login")} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Almost there"
      subtitle="Tell us your full name so the clinic can recognize you at check-in."
      showBack
    >
      <Input
        label="Full name"
        placeholder="e.g. Ahmed Khan"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        textContentType="name"
      />
      <Button
        label="Create account & continue"
        onPress={finish}
        loading={loading}
        disabled={!ready}
      />
      <ErrorText>{error}</ErrorText>
    </AuthShell>
  );
}
