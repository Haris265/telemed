import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorText, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPkDisplay } from "@/lib/phone";
import { colors } from "@/constants/theme";

export default function LoginOtpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{
    phone?: string;
    needsName?: string;
    devOtp?: string;
  }>();

  const phone = typeof params.phone === "string" ? params.phone : "";
  const needsName = params.needsName === "1";
  const initialDevOtp = typeof params.devOtp === "string" ? params.devOtp : "";

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const displayPhone = useMemo(() => formatPkDisplay(phone), [phone]);

  async function resend() {
    if (!phone) return;
    setResending(true);
    setError("");
    try {
      const res = await api.requestOtp(phone);
      setDevOtp(res.otp || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }

  async function continueNext() {
    if (!phone || otp.length < 6) return;
    setError("");

    if (needsName) {
      router.push({
        pathname: "/login/name",
        params: { phone, otp },
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp({ phone, otp });
      await signIn(res.access, res.refresh, res.patient);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    return (
      <AuthShell title="Verify OTP" subtitle="Missing phone number." showBack>
        <Button label="Start over" onPress={() => router.replace("/login")} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter verification code"
      subtitle={`Code sent to ${displayPhone} on WhatsApp.`}
      showBack
    >
      <Input
        label="One-time code"
        placeholder="••••••"
        keyboardType="number-pad"
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
        maxLength={6}
        autoFocus
        style={styles.otpInput}
      />
      {devOtp ? (
        <View style={styles.devBox}>
          <Text style={styles.devLabel}>Dev OTP</Text>
          <Text style={styles.devCode}>{devOtp}</Text>
        </View>
      ) : null}
      <Button
        label={needsName ? "Continue" : "Verify & sign in"}
        onPress={continueNext}
        loading={loading}
        disabled={otp.length < 6}
      />
      <Button
        label="Resend code"
        variant="secondary"
        onPress={resend}
        loading={resending}
      />
      <ErrorText>{error}</ErrorText>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  otpInput: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    textAlign: "center",
    paddingVertical: 16,
  },
  devBox: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  devLabel: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  devCode: {
    color: colors.warning,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 4,
  },
});
