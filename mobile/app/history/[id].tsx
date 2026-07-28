import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { Badge, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { colors } from "@/constants/theme";

function NoteBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <Text style={styles.noteText}>
      <Text style={styles.noteLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

export default function VisitReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitId = Number(id);
  const [visit, setVisit] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(visitId)) {
      setError("Invalid visit");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const data = await api.appointmentDetail(visitId);
      setVisit(data);
    } catch (e) {
      setVisit(null);
      setError(e instanceof Error ? e.message : "Could not load visit report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [visitId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  if (loading && !visit) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!visit) {
    return (
      <Screen>
        <Empty title="Visit not found" body={error || "Try going back."} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const hasSoap =
    visit.clinical_note &&
    (visit.clinical_note.subjective ||
      visit.clinical_note.objective ||
      visit.clinical_note.assessment ||
      visit.clinical_note.plan);

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
        <Title>Visit report</Title>
        <Subtitle>{visit.doctor_name}</Subtitle>
        <ErrorText>{error}</ErrorText>

        <View style={{ gap: 12, marginTop: 16 }}>
          <Card style={{ gap: 8 }}>
            <View style={styles.row}>
              <Text style={styles.token}>{visit.token_code}</Text>
              <Badge label={statusLabel(visit.status)} tone={statusTone(visit.status)} />
            </View>
            <Text style={styles.meta}>Date: {formatDate(visit.token_date)}</Text>
            <Text style={styles.meta}>Time: {formatDateTime(visit.scheduled_at)}</Text>
            {visit.notes ? <Text style={styles.meta}>Notes: {visit.notes}</Text> : null}
            {visit.rejection_reason ? (
              <Text style={styles.reject}>Reason: {visit.rejection_reason}</Text>
            ) : null}
          </Card>

          <Card style={{ gap: 8 }}>
            <Text style={styles.section}>Doctor notes (SOAP)</Text>
            {hasSoap ? (
              <View style={{ gap: 6 }}>
                <NoteBlock label="Subjective" value={visit.clinical_note?.subjective} />
                <NoteBlock label="Objective" value={visit.clinical_note?.objective} />
                <NoteBlock label="Assessment" value={visit.clinical_note?.assessment} />
                <NoteBlock label="Plan" value={visit.clinical_note?.plan} />
              </View>
            ) : (
              <Text style={styles.meta}>No doctor notes for this visit yet.</Text>
            )}
          </Card>

          <Card style={{ gap: 8 }}>
            <Text style={styles.section}>Prescription</Text>
            {visit.prescription?.items?.length ? (
              <View style={{ gap: 10 }}>
                {visit.prescription.notes ? (
                  <Text style={styles.meta}>{visit.prescription.notes}</Text>
                ) : null}
                {visit.prescription.items.map((item, index) => (
                  <View key={item.id ?? index} style={styles.rxItem}>
                    <Text style={styles.rxName}>{item.medicine_name}</Text>
                    {item.dosage ? (
                      <Text style={styles.meta}>Dosage: {item.dosage}</Text>
                    ) : null}
                    {item.frequency ? (
                      <Text style={styles.meta}>Frequency: {item.frequency}</Text>
                    ) : null}
                    {item.duration ? (
                      <Text style={styles.meta}>Duration: {item.duration}</Text>
                    ) : null}
                    {item.instructions ? (
                      <Text style={styles.meta}>Instructions: {item.instructions}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>No prescription for this visit.</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  token: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  section: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  noteText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  noteLabel: {
    fontWeight: "700",
    color: colors.text,
  },
  rxItem: {
    gap: 2,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rxName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  reject: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
