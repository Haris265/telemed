import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { GeocodeResult } from "@/lib/mapUtils";
import { colors } from "@/constants/theme";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  onDirections: () => void;
  onClear?: () => void;
  loading?: boolean;
  suggestions?: GeocodeResult[];
  onSelectSuggestion?: (item: GeocodeResult) => void;
  placeholder?: string;
  showNoResults?: boolean;
};

function HighlightedLine({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query: string;
  style: object;
  highlightStyle: object;
}) {
  const q = query.trim();
  if (!q) {
    return (
      <Text style={style} numberOfLines={2}>
        {text}
      </Text>
    );
  }

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);

  if (idx === -1) {
    return (
      <Text style={style} numberOfLines={2}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={2}>
      {idx > 0 ? <Text style={styles.suggestionNormal}>{text.slice(0, idx)}</Text> : null}
      <Text style={highlightStyle}>{text.slice(idx, idx + q.length)}</Text>
      <Text style={styles.suggestionNormal}>{text.slice(idx + q.length)}</Text>
    </Text>
  );
}

export function MapSearchBar({
  value,
  onChangeText,
  onSubmit,
  onDirections,
  onClear,
  loading,
  suggestions = [],
  onSelectSuggestion,
  placeholder = "Search area or address",
  showNoResults = false,
}: Props) {
  const trimmed = value.trim();
  const showDropdown =
    trimmed.length >= 2 && (loading || suggestions.length > 0 || showNoResults);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText("");
              onClear?.();
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
        <View style={styles.divider} />
        <Pressable
          onPress={onDirections}
          style={({ pressed }) => [styles.dirBtn, pressed && { opacity: 0.85 }]}
          accessibilityLabel="Get directions"
        >
          <Ionicons name="navigate" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {showDropdown ? (
        <View style={styles.suggestions}>
          {loading && !suggestions.length ? (
            <View style={styles.suggestionRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.suggestionText}>Searching…</Text>
            </View>
          ) : null}

          {!loading && showNoResults && !suggestions.length ? (
            <View style={styles.suggestionRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.muted} />
              <Text style={styles.suggestionText}>
                No places found. Try Gulshan, Clifton, or DHA.
              </Text>
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionScroll}
          >
            {suggestions.map((item, index) => (
              <Pressable
                key={`${item.latitude}-${item.longitude}-${index}`}
                onPress={() => {
                  Keyboard.dismiss();
                  onSelectSuggestion?.(item);
                }}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  index < suggestions.length - 1 && styles.suggestionBorder,
                  pressed && { backgroundColor: "#f3f4f6" },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={colors.muted}
                  style={styles.suggestionIcon}
                />
                <View style={styles.suggestionTextWrap}>
                  <HighlightedLine
                    text={item.primaryLine}
                    query={trimmed}
                    style={styles.suggestionTitle}
                    highlightStyle={styles.suggestionMatch}
                  />
                  {item.detailLine ? (
                    <Text style={styles.suggestionSubtitle} numberOfLines={2}>
                      {item.detailLine}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 100,
    elevation: 12,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 14,
    minHeight: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    flex: 1,
    color: "#1f2937",
    fontSize: 15,
    paddingVertical: 12,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#e5e7eb",
  },
  dirBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 300,
  },
  suggestionScroll: {
    maxHeight: 300,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionIcon: {
    marginTop: 2,
  },
  suggestionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  suggestionTextWrap: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
  },
  suggestionNormal: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "400",
  },
  suggestionMatch: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  suggestionSubtitle: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionText: {
    flex: 1,
    color: "#1f2937",
    fontSize: 14,
    lineHeight: 18,
  },
});
