import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search patient, phone, or token…",
}: Props) {
  const { colors, fonts } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 48,
      }}
    >
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        style={{
          flex: 1,
          color: colors.text,
          fontSize: 15,
          paddingVertical: 12,
          fontFamily: fonts.sans,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Ionicons
          name="close-circle"
          size={18}
          color={colors.muted}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </View>
  );
}
