import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { LiveQueueCard } from "@/components/LiveQueueCard";
import { Empty, ErrorText, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import type { QueueInfo } from "@/lib/types";
import { colors } from "@/constants/theme";

const POLL_MS = 12000;

export default function AppointmentQueueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api.queue(Number(id));
      setQueue(data);
      setLastUpdated(new Date());
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
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(load, POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [load]),
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
        <Text style={styles.liveHint}>
          Live updates every {POLL_MS / 1000}s
          {lastUpdated
            ? ` · ${lastUpdated.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : ""}
        </Text>
        <ErrorText>{error}</ErrorText>
        <LiveQueueCard queue={queue} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liveHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 12,
  },
});
