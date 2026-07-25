import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { Badge, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { QueueInfo } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function AppointmentQueueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      setQueue(await api.queue(Number(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setQueue(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!queue) {
    return (
      <Screen>
        <Empty title="Queue not found" />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const approx = new Date(queue.estimated_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
      >
        <Badge label={queue.status} tone="success" />
        <View style={{ height: 10 }} />
        <Title>{queue.token_code}</Title>
        <Subtitle>Dr. {queue.doctor_name}</Subtitle>
        <ErrorText>{error}</ErrorText>

        <View style={{ height: 16 }} />

        <Card style={{ gap: 12 }}>
          <Stat label="Queue position" value={`#${queue.position}`} />
          <Stat label="People ahead" value={String(queue.people_ahead)} />
          <Stat label="Date" value={queue.token_date} />
          <Stat label="Approx time" value={approx} />
        </Card>

        <View style={{ height: 16 }} />

        <Card>
          <Text style={styles.message}>{queue.message}</Text>
          <Text style={styles.hint}>
            Come to the clinic around this time — your token number is your place in line.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  hint: {
    color: colors.muted,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  stat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: { color: colors.muted, fontSize: 14 },
  statValue: { color: colors.text, fontWeight: "700", fontSize: 15 },
});
