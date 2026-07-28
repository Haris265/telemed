import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Badge, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, statusLabel, statusTone } from "@/lib/format";
import type { PatientHistory } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.history();
      setHistory(data);
    } catch (e) {
      setHistory(null);
      setError(e instanceof Error ? e.message : "Could not load history");
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
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <Title>My medical history</Title>
        <Subtitle>
          View past visits, doctors you consulted, and your reports.
        </Subtitle>
        <ErrorText>{error}</ErrorText>

        {loading && !refreshing ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !history ? (
          <Empty title="No history" body={error || "Could not load your records."} />
        ) : (
          <View style={{ gap: 16, marginTop: 16 }}>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{history.total_visits}</Text>
                <Text style={styles.statLabel}>Completed visits</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{history.doctors_seen_count}</Text>
                <Text style={styles.statLabel}>Doctors seen</Text>
              </Card>
            </View>

            {history.last_visit_date ? (
              <Card style={{ gap: 6 }}>
                <Text style={styles.section}>Last visit</Text>
                <Text style={styles.meta}>{formatDate(history.last_visit_date)}</Text>
              </Card>
            ) : null}

            {history.doctors_seen.length ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.section}>Doctors you visited</Text>
                {history.doctors_seen.map((doctor) => (
                  <Card key={doctor.uuid} style={{ gap: 6 }}>
                    <View style={styles.row}>
                      <Text style={styles.doctorName}>{doctor.full_name}</Text>
                      <Badge
                        label={`${doctor.visit_count} visit${doctor.visit_count === 1 ? "" : "s"}`}
                        tone="info"
                      />
                    </View>
                    {doctor.specialities.length ? (
                      <Text style={styles.meta}>
                        {doctor.specialities.map((s) => s.name).join(" · ")}
                      </Text>
                    ) : null}
                    {doctor.last_visit_date ? (
                      <Text style={styles.meta}>
                        Last visit: {formatDate(doctor.last_visit_date)}
                      </Text>
                    ) : null}
                  </Card>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <Text style={styles.section}>All visits & reports</Text>
              {!history.visit_history.length ? (
                <Empty
                  title="No visits yet"
                  body="Book an appointment to start your medical history."
                />
              ) : (
                history.visit_history.map((visit) => (
                  <Pressable
                    key={visit.id}
                    onPress={() => router.push(`/history/${visit.id}`)}
                  >
                    <Card style={{ gap: 8 }}>
                      <View style={styles.row}>
                        <Text style={styles.token}>{visit.token_code}</Text>
                        <Badge
                          label={statusLabel(visit.status)}
                          tone={statusTone(visit.status)}
                        />
                      </View>
                      <Text style={styles.doctorName}>{visit.doctor_name}</Text>
                      <Text style={styles.meta}>
                        {formatDate(visit.token_date)} · {formatDate(visit.scheduled_at)}
                      </Text>
                      {visit.clinical_note || visit.prescription?.items?.length ? (
                        <Text style={styles.reportHint}>Report available →</Text>
                      ) : (
                        <Text style={styles.meta}>Tap to view details</Text>
                      )}
                    </Card>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
  },
  statValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  doctorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  token: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  reportHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});
