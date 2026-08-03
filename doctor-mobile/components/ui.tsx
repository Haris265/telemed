import { ReactNode, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { useTheme } from "@/lib/theme";
import type { ThemeColors } from "@/constants/theme";
import { fonts as fontNames } from "@/constants/theme";

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ClinicBackdrop />
      <View
        style={[
          { flex: 1, paddingHorizontal: 16, paddingTop: 12, zIndex: 1 },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { colors, fonts } = useTheme();
  return (
    <Text
      style={{
        color: colors.text,
        fontSize: 28,
        fontFamily: fonts.serifBold,
        letterSpacing: -0.4,
      }}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  const { colors, fonts } = useTheme();
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 6,
        fontFamily: fonts.sans,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors, fonts } = useTheme();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : colors.surfaceAlt;
  const textColor = variant === "secondary" ? colors.text : "#ffffff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          opacity: pressed || disabled || loading ? 0.7 : 1,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={{
            color: textColor,
            fontFamily: fonts.sansBold,
            fontSize: 15,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { colors, fonts } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            fontFamily: fonts.sansSemi,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          {
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.text,
            fontSize: 16,
            fontFamily: fonts.sans,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

export function TextArea(props: TextInputProps & { label?: string }) {
  return (
    <Input
      {...props}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      style={[{ minHeight: 90 }, props.style]}
    />
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const { colors, fonts } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    success: { bg: "rgba(4,120,87,0.12)", fg: colors.success },
    warning: { bg: "rgba(180,83,9,0.12)", fg: colors.warning },
    info: { bg: "rgba(15,118,110,0.12)", fg: colors.primary },
    danger: { bg: "rgba(185,28,28,0.12)", fg: colors.danger },
  }[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: map.bg,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: fonts.sansBold,
          color: map.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const { colors, fonts } = useTheme();
  if (!children) return null;
  return (
    <Text
      style={{
        color: colors.danger,
        fontSize: 13,
        marginTop: 8,
        fontFamily: fonts.sans,
      }}
    >
      {children}
    </Text>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 6 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansSemi,
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
            fontFamily: fonts.sans,
          }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}

export function StatCard({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: number | string;
  color?: string;
  onPress?: () => void;
}) {
  const { colors, fonts } = useTheme();
  const accent = color ?? colors.primary;
  const content = (
    <>
      <Text
        style={{
          fontSize: 28,
          fontFamily: fonts.sansExtra,
          color: accent,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
        }}
      >
        {label}
      </Text>
    </>
  );
  const cardStyle = {
    flex: 1,
    minWidth: "45%" as const,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: accent,
    padding: 14,
    gap: 4,
  };

  if (!onPress) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.75 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

/** Build StyleSheet that tracks palette changes. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors, f: typeof fontNames) => T,
) {
  const { colors, fonts } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, fonts)), [colors, fonts, factory]);
}
