import { useState } from "react";
import { useRouter } from "expo-router";

import { AuthShell } from "@/components/AuthShell";
import { PkPhoneInput } from "@/components/PkPhoneInput";
import { Button, ErrorText } from "@/components/ui";
import { api } from "@/lib/api";
import { isValidPkMobile, normalizePkPhone, PK_LOCAL_LENGTH } from "@/lib/phone";

export default function LoginPhoneScreen() {
  const router = useRouter();
  const [local, setLocal] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = isValidPkMobile(local) && local.length === PK_LOCAL_LENGTH;

  async function sendOtp() {
    if (!valid) {
      setError("Enter a valid Pakistani mobile number (10 digits, starts with 3).");
      return;
    }
    setLoading(true);
    setError("");
    const phone = normalizePkPhone(local);
    try {
      const res = await api.requestOtp(phone);
      router.push({
        pathname: "/login/otp",
        params: {
          phone,
          needsName: res.needs_name ? "1" : "0",
          devOtp: res.otp || "",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your WhatsApp number. We’ll send a one-time code."
    >
      <PkPhoneInput value={local} onChangeLocal={setLocal} autoFocus />
      <Button
        label="Continue"
        onPress={sendOtp}
        loading={loading}
        disabled={!valid}
      />
      <ErrorText>{error}</ErrorText>
    </AuthShell>
  );
}
