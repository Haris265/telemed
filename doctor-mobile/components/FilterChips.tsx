import { ScrollView, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme";

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
  const { colors, fonts } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      style={{ flexGrow: 0, overflow: "visible" }}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 4,
        paddingRight: 24,
        alignItems: "center",
      }}
    >
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 0,
                gap: 6,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active
                  ? "rgba(15,118,110,0.12)"
                  : colors.surface,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 40,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {opt.icon ? (
              <Ionicons
                name={opt.icon}
                size={14}
                color={active ? colors.primary : colors.muted}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                color: active ? colors.primary : colors.muted,
                fontSize: 13,
                fontFamily: fonts.sansSemi,
                flexShrink: 0,
              }}
            >
              {opt.label}
            </Text>
            {typeof opt.count === "number" ? (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: active
                    ? "rgba(15,118,110,0.2)"
                    : colors.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.muted,
                    fontSize: 11,
                    fontFamily: fonts.sansExtra,
                  }}
                >
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
  const { colors, fonts } = useTheme();
  return (
    <View style={{ gap: 4, marginTop: 4, marginBottom: 8 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 14,
          fontFamily: fonts.sansBold,
        }}
      >
        {label}
      </Text>
      {hint ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            fontFamily: fonts.sansSemi,
            lineHeight: 16,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
