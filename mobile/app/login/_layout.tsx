import { Stack } from "expo-router";

import { colors } from "@/constants/theme";

export default function LoginLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="name" />
    </Stack>
  );
}
