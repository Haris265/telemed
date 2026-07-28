import { ReactNode, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { useTheme } from "@/lib/theme";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  showBack?: boolean;
};

export function AuthShell({ title, subtitle, children, showBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, fonts } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        flex: {
          flex: 1,
        },
        inner: {
          flex: 1,
          paddingHorizontal: 24,
          zIndex: 1,
        },
        back: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          alignSelf: "flex-start",
        },
        backText: {
          color: colors.text,
          fontSize: 15,
          fontFamily: fonts.sansSemi,
        },
        header: {
          marginTop: 8,
          marginBottom: 28,
        },
        brandRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        },
        brandMark: {
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: colors.primary,
        },
        brand: {
          color: colors.primary,
          fontSize: 13,
          fontFamily: fonts.sansExtra,
          letterSpacing: 2.2,
          textTransform: "uppercase",
        },
        title: {
          color: colors.text,
          fontSize: 30,
          fontFamily: fonts.serifBold,
          letterSpacing: -0.4,
        },
        subtitle: {
          color: colors.muted,
          fontSize: 15,
          lineHeight: 22,
          marginTop: 8,
          maxWidth: 320,
          fontFamily: fonts.sans,
        },
        form: {
          gap: 16,
        },
      }),
    [colors, fonts],
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <ClinicBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.inner}>
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}

          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark} />
              <Text style={styles.brand}>Telemed</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
