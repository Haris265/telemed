import type { ReactNode } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
              name="clinics/nearby"
              options={{
                headerShown: true,
                title: "Nearby clinics",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="clinics/[id]/index"
              options={{
                headerShown: true,
                title: "Clinic",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="clinics/[id]/speciality/[specId]"
              options={{
                headerShown: true,
                title: "Doctors",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="symptoms/index"
              options={{
                headerShown: true,
                title: "Symptoms checker",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="book/speciality/[id]"
              options={{
                headerShown: true,
                title: "Doctors",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
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
            <Stack.Screen
              name="history/index"
              options={{
                headerShown: true,
                title: "My history",
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.surface },
              }}
            />
            <Stack.Screen
              name="history/[id]"
              options={{
                headerShown: true,
                title: "Visit report",
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
