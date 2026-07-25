import { useCallback, useEffect, useRef, useState } from "react";
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

import { LiveQueueCard } from "@/components/LiveQueueCard";
import { SearchField } from "@/components/SearchField";
import { Badge, Button, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment, QueueInfo } from "@/lib/types";
import { colors } from "@/constants/theme";

const POLL_MS = 15000;

export default function QueueScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [tokenQuery, setTokenQuery] = useState("");
  const [live, setLive] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveIdRef = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const refreshLive = useCallback(async (appointmentId: number) => {
    try {
      const q = await api.queue(appointmentId);
      setLive(q);
      liveIdRef.current = appointmentId;
      setLastUpdated(new Date());
      setSearchError("");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Could not refresh queue");
    }
  }, []);

  const startPoll = useCallback(
    (appointmentId: number) => {
      clearPoll();
      pollRef.current = setInterval(() => {
        refreshLive(appointmentId);
      }, POLL_MS);
    },
    [refreshLive],
  );

  const loadList = useCallback(async () => {
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
      loadList();
      return () => clearPoll();
    }, [loadList]),
  );

  useEffect(() => {
    return () => clearPoll();
  }, []);

  async function searchToken() {
    const q = tokenQuery.trim();
    if (!q) {
      setSearchError("Enter your token number (e.g. 5 or AH-005).");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const info = await api.lookupToken(q, true);
      setLive(info);
      liveIdRef.current = info.appointment_id;
      setLastUpdated(new Date());
      startPoll(info.appointment_id);
    } catch (e) {
      setLive(null);
      liveIdRef.current = null;
      clearPoll();
      setSearchError(e instanceof Error ? e.message : "Token not found");
    } finally {
      setSearching(false);
    }
  }

  async function openAppointment(id: number) {
    setSearching(true);
    setSearchError("");
    try {
      await refreshLive(id);
      startPoll(id);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Screen>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(a) => String(a.id)}
        style={{ flex: 1, marginTop: 4 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={() => {
              setRefreshing(true);
              loadList();
              if (liveIdRef.current) refreshLive(liveIdRef.current);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Title>Live queue</Title>
            <Subtitle>
              Search today’s token to see who’s being served and how long until your turn.
            </Subtitle>

            <View style={styles.searchBlock}>
              <SearchField
                value={tokenQuery}
                onChangeText={setTokenQuery}
                placeholder="Token number e.g. 5 or AH-005"
              />
              <Button
                label="Track token"
                onPress={searchToken}
                loading={searching}
                disabled={!tokenQuery.trim()}
              />
              <ErrorText>{searchError}</ErrorText>
            </View>

            {live ? (
              <View style={styles.liveBlock}>
                <View style={styles.liveHeader}>
                  <Text style={styles.liveTitle}>Live status</Text>
                  <Text style={styles.liveMeta}>
                    {lastUpdated
                      ? `Updated ${lastUpdated.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : "Updating…"}
                  </Text>
                </View>
                <LiveQueueCard queue={live} />
                <Button
                  label="Open full details"
                  variant="secondary"
                  onPress={() => router.push(`/appointment/${live.appointment_id}`)}
                />
                <Button
                  label="Clear"
                  variant="secondary"
                  onPress={() => {
                    setLive(null);
                    liveIdRef.current = null;
                    clearPoll();
                  }}
                />
              </View>
            ) : null}

            <ErrorText>{error}</ErrorText>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <Text style={styles.section}>Your upcoming tokens</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Empty
              title="No upcoming appointments"
              body="Book a token, then track it here with your number."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openAppointment(item.id)}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.token}>{item.token_code}</Text>
              <Text style={styles.name}>Dr. {item.doctor_name}</Text>
              <Text style={styles.meta}>
                {item.token_date} · #{item.token_number}
              </Text>
            </View>
            <Badge label="Track" tone="info" />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: 10,
    marginTop: 4,
  },
  liveBlock: {
    gap: 12,
    paddingTop: 4,
  },
  liveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  liveMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
  },
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
