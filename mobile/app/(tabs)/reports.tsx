import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Badge, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, statusLabel, statusTone } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useTheme } from "@/lib/theme";
import type { PatientHistory, VisitAttachment } from "@/lib/types";
import { colors as themeColors, fonts as themeFonts } from "@/constants/theme";

function MediaHint({ attachments }: { attachments?: VisitAttachment[] }) {
  const list = attachments || [];
  if (!list.length) {
    return <Text style={hintStyles.meta}>Tap to view details</Text>;
  }
  const firstImage = list.find((a) => a.kind === "image");
  const voiceCount = list.filter((a) => a.kind === "voice").length;
  const imageCount = list.filter((a) => a.kind === "image").length;
  const uri = firstImage ? resolveMediaUrl(firstImage.url) : "";

  return (
    <View style={hintStyles.row}>
      {uri ? (
        <Image source={{ uri }} style={hintStyles.thumb} />
      ) : (
        <View style={[hintStyles.thumb, hintStyles.thumbIcon]}>
          <Ionicons name="mic" size={18} color={themeColors.primary} />
        </View>
      )}
      <Text style={hintStyles.text}>
        {[
          imageCount ? `${imageCount} photo${imageCount === 1 ? "" : "s"}` : "",
          voiceCount ? `${voiceCount} voice` : "",
        ]
          .filter(Boolean)
          .join(" · ")}{" "}
        · Open
      </Text>
    </View>
  );
}

const hintStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: themeColors.surfaceAlt,
  },
  thumbIcon: { alignItems: "center", justifyContent: "center" },
  text: {
    flex: 1,
    color: themeColors.primary,
    fontSize: 13,
    fontFamily: themeFonts.sansSemi,
  },
  meta: {
    color: themeColors.muted,
    fontSize: 13,
    fontFamily: themeFonts.sans,
  },
});

export default function ReportsScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          fontFamily: fonts.sansExtra,
        },
        statLabel: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
          textAlign: "center",
        },
        section: {
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansBold,
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
          fontFamily: fonts.sansBold,
        },
        token: {
          color: colors.primary,
          fontFamily: fonts.sansExtra,
          fontSize: 14,
        },
        meta: {
          color: colors.muted,
          fontSize: 13,
          lineHeight: 18,
          fontFamily: fonts.sans,
        },
        reportHint: {
          color: colors.primary,
          fontSize: 13,
          fontFamily: fonts.sansSemi,
        },
      }),
    [colors, fonts],
  );

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
        <Title>My reports</Title>
        <Subtitle>
          Past visits, doctors you consulted, and visit media.
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
                      <MediaHint attachments={visit.attachments} />
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
