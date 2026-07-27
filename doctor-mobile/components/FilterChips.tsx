import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/theme";

export type FilterOption = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
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
            {opt.icon ? (
              <Ionicons
                name={opt.icon}
                size={14}
                color={active ? colors.primary : colors.muted}
              />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
            {typeof opt.count === "number" ? (
              <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>
                  {opt.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ResultSummary({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: "rgba(59,130,246,0.35)",
  },
  countText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  countTextActive: {
    color: colors.primary,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
});
