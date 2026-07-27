import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export { ErrorBoundary } from "expo-router";

function Gate({ children }: { children: ReactNode }) {
  const { doctor, loading } = useAuth();
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
  if (!doctor && !onLogin) return <Redirect href="/login" />;
  if (doctor && onLogin) return <Redirect href="/(tabs)" />;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen
              name="appointment/[id]"
              options={{
                headerShown: true,
                title: "Visit",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="patient/[uuid]"
              options={{
                headerShown: true,
                title: "Patient",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
          </Stack>
        </Gate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
