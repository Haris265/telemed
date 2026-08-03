import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

function Gate({ children }: { children: ReactNode }) {
  const { doctor, loading } = useAuth();
  const { colors } = useTheme();
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

function ThemedRoot() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style="dark" />
      <AuthProvider>
        <Gate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: {
                fontFamily: "Manrope_700Bold",
                color: colors.text,
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen
              name="appointment/[id]"
              options={{ headerShown: true, title: "Visit" }}
            />
            <Stack.Screen
              name="patient/[uuid]"
              options={{ headerShown: true, title: "Patient" }}
            />
          </Stack>
        </Gate>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
