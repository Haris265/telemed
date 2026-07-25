import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";

import { colors } from "@/constants/theme";

export type FilterOption = {
  id: string;
  label: string;
};

type Props = {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function FilterChips({ options, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ResultCount({ label }: { label: string }) {
  return (
    <View style={styles.countWrap}>
      <Text style={styles.count}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.primary,
  },
  countWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  count: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
});
