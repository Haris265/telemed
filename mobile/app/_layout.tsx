import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

function Gate({ children }: { children: ReactNode }) {
  const { patient, loading } = useAuth();
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
  if (!patient && !onLogin) return <Redirect href="/login" />;
  if (patient && onLogin) return <Redirect href="/(tabs)" />;

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
              name="clinics/nearby"
              options={{ headerShown: true, title: "Nearby clinics" }}
            />
            <Stack.Screen
              name="clinics/[id]/index"
              options={{ headerShown: true, title: "Clinic" }}
            />
            <Stack.Screen
              name="clinics/[id]/speciality/[specId]"
              options={{ headerShown: true, title: "Doctors" }}
            />
            <Stack.Screen
              name="symptoms/index"
              options={{ headerShown: true, title: "Symptoms checker" }}
            />
            <Stack.Screen
              name="book/speciality/[id]"
              options={{ headerShown: true, title: "Doctors" }}
            />
            <Stack.Screen
              name="book/[doctorUuid]"
              options={{ headerShown: true, title: "Pick a date" }}
            />
            <Stack.Screen
              name="appointment/[id]"
              options={{ headerShown: true, title: "Your queue" }}
            />
            <Stack.Screen name="history/index" options={{ headerShown: false }} />
            <Stack.Screen
              name="history/[id]"
              options={{ headerShown: true, title: "Visit report" }}
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
