import { ActivityIndicator, Text, View } from "react-native";

import { useTheme } from "@/lib/theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text
        style={{
          color: colors.muted,
          fontSize: 14,
          fontFamily: fonts.sansSemi,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
