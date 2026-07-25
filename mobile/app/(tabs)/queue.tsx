import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Badge, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function QueueScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await api.appointments("upcoming"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  return (
    <Screen>
      <Title>My queue</Title>
      <Subtitle>Your upcoming tokens and estimated clinic times.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <Empty
              title="No upcoming appointments"
              body="Book a token from the Book tab."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/appointment/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.token}>{item.token_code}</Text>
                <Text style={styles.name}>Dr. {item.doctor_name}</Text>
                <Text style={styles.meta}>
                  {item.token_date} · #{item.token_number}
                </Text>
              </View>
              <Badge label="Upcoming" tone="success" />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  token: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  name: { color: colors.text, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 13 },
});
