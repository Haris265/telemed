import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/theme";
import { PK_LOCAL_LENGTH, toLocalPkInput } from "@/lib/phone";

type Props = {
  value: string;
  onChangeLocal: (local10: string) => void;
  autoFocus?: boolean;
};

export function PkPhoneInput({ value, onChangeLocal, autoFocus }: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Mobile number</Text>
      <View style={styles.field}>
        <View style={styles.prefix}>
          <Text style={styles.flag} accessibilityLabel="Pakistan">
            🇵🇰
          </Text>
          <Text style={styles.code}>+92</Text>
        </View>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => onChangeLocal(toLocalPkInput(t))}
          keyboardType="number-pad"
          placeholder="3XXXXXXXXX"
          placeholderTextColor={colors.muted}
          maxLength={PK_LOCAL_LENGTH}
          autoFocus={autoFocus}
          textContentType="telephoneNumber"
        />
      </View>
      <Text style={styles.hint}>10 digits, starting with 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
  },
  flag: {
    fontSize: 22,
    lineHeight: 26,
  },
  code: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1.2,
    paddingVertical: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
