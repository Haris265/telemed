import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export { ErrorBoundary } from "expo-router";

function Gate({ children }: { children: ReactNode }) {
  const { patient, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const onLogin = segments[0] === "login";
  if (!patient && !onLogin) return <Redirect href="/login" />;
  if (patient && onLogin) return <Redirect href="/(tabs)" />;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Gate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen
            name="book/[doctorUuid]"
            options={{
              headerShown: true,
              title: "Pick a date",
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="appointment/[id]"
            options={{
              headerShown: true,
              title: "Your queue",
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}
