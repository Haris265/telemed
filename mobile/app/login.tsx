import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button, ErrorText, Input, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await api.requestOtp(phone);
      setNeedsName(res.needs_name);
      setDevOtp(res.otp || "");
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyOtp({
        phone,
        otp,
        name: needsName ? name : undefined,
      });
      await signIn(res.access, res.refresh, res.patient);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Telemed</Text>
          <Title>Patient login</Title>
          <Subtitle>Use your WhatsApp phone number to get a one-time code.</Subtitle>

          <View style={{ height: 24 }} />

          {step === "phone" ? (
            <View style={{ gap: 14 }}>
              <Input
                label="Phone (with country code)"
                placeholder="923001234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
              <Button
                label="Send OTP"
                onPress={sendOtp}
                loading={loading}
                disabled={phone.length < 10}
              />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {needsName ? (
                <Input
                  label="Full name"
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              ) : null}
              <Input
                label="OTP"
                placeholder="6-digit code"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
              />
              {devOtp ? <Text style={styles.devHint}>Dev OTP: {devOtp}</Text> : null}
              <Button
                label="Verify & continue"
                onPress={verify}
                loading={loading}
                disabled={otp.length < 6 || (needsName && name.trim().length < 2)}
              />
              <Button
                label="Change number"
                variant="secondary"
                onPress={() => {
                  setStep("phone");
                  setOtp("");
                  setDevOtp("");
                }}
              />
            </View>
          )}
          <ErrorText>{error}</ErrorText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 48,
    paddingBottom: 40,
  },
  brand: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  devHint: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "600",
  },
});
