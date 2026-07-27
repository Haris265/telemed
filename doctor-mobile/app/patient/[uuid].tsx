import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { LoadingState } from "@/components/LoadingState";
import { Badge, Card, Empty, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorPatientDetail } from "@/lib/types";
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { colors } from "@/constants/theme";

export default function PatientDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<DoctorPatientDetail | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!uuid) return;
    const data = await api.patient(uuid);
    setPatient(data);
  }, [uuid]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          colors={[colors.primary]}
          onRefresh={onRefresh}
        />
      }
    >
      {loading && !refreshing && !patient ? (
        <LoadingState label="Loading patient report…" />
      ) : !patient ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error || "Patient not found"}</Text>
        </View>
      ) : (
        <>
      <Card style={{ gap: 6 }}>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.meta}>{patient.phone}</Text>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard label="Total visits" value={patient.total_visits} color={colors.success} />
        <StatCard label="Rejected" value={patient.rejected_count} color={colors.danger} />
        <StatCard
          label="Rejection rate"
          value={`${patient.rejection_rate}%`}
          color={colors.warning}
        />
        <StatCard
          label="All appointments"
          value={patient.total_appointments}
          color={colors.primary}
        />
      </View>

      {patient.last_visit_date ? (
        <Card style={{ gap: 8 }}>
          <Text style={styles.section}>Last visit</Text>
          <Text style={styles.meta}>{formatDate(patient.last_visit_date)}</Text>
          {patient.last_clinical_note ? (
            <View style={{ gap: 4 }}>
              <Text style={styles.subSection}>SOAP Notes</Text>
              {patient.last_clinical_note.subjective ? (
                <Text style={styles.noteText}>
                  S: {patient.last_clinical_note.subjective}
                </Text>
              ) : null}
              {patient.last_clinical_note.objective ? (
                <Text style={styles.noteText}>
                  O: {patient.last_clinical_note.objective}
                </Text>
              ) : null}
              {patient.last_clinical_note.assessment ? (
                <Text style={styles.noteText}>
                  A: {patient.last_clinical_note.assessment}
                </Text>
              ) : null}
              {patient.last_clinical_note.plan ? (
                <Text style={styles.noteText}>
                  P: {patient.last_clinical_note.plan}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.meta}>No SOAP notes on last visit.</Text>
          )}
          {patient.last_prescription?.items?.length ? (
            <View style={{ gap: 4 }}>
              <Text style={styles.subSection}>Prescription</Text>
              {patient.last_prescription.items.map((item, i) => (
                <Text key={i} style={styles.noteText}>
                  • {item.medicine_name}
                  {item.dosage ? ` ${item.dosage}` : ""}
                  {item.frequency ? ` — ${item.frequency}` : ""}
                  {item.duration ? ` for ${item.duration}` : ""}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>No prescription on last visit.</Text>
          )}
        </Card>
      ) : null}

      {patient.next_appointment ? (
        <Card style={{ gap: 6 }}>
          <Text style={styles.section}>Next appointment</Text>
          <Text style={styles.meta}>
            {patient.next_appointment.token_code} ·{" "}
            {formatDate(patient.next_appointment.token_date)} ·{" "}
            {formatDateTime(patient.next_appointment.scheduled_at)}
          </Text>
          <Pressable
            onPress={() =>
              router.push(`/appointment/${patient.next_appointment!.id}`)
            }
          >
            <Text style={styles.link}>Open appointment →</Text>
          </Pressable>
        </Card>
      ) : null}

      <Text style={styles.section}>Visit history</Text>

      {patient.visit_history.length ? (
        patient.visit_history.map((visit) => {
          const expanded = expandedId === visit.id;
          return (
            <Pressable
              key={visit.id}
              onPress={() => setExpandedId(expanded ? null : visit.id)}
              style={styles.visitCard}
            >
              <View style={styles.row}>
                <Text style={styles.token}>{visit.token_code}</Text>
                <Badge
                  label={statusLabel(visit.status)}
                  tone={statusTone(visit.status)}
                />
              </View>
              <Text style={styles.meta}>
                {formatDate(visit.token_date)} · {formatDateTime(visit.scheduled_at)}
              </Text>
              {expanded ? (
                <View style={{ gap: 6, marginTop: 8 }}>
                  {visit.clinical_note ? (
                    <View>
                      <Text style={styles.subSection}>SOAP</Text>
                      {visit.clinical_note.subjective ? (
                        <Text style={styles.noteText}>S: {visit.clinical_note.subjective}</Text>
                      ) : null}
                      {visit.clinical_note.objective ? (
                        <Text style={styles.noteText}>O: {visit.clinical_note.objective}</Text>
                      ) : null}
                      {visit.clinical_note.assessment ? (
                        <Text style={styles.noteText}>A: {visit.clinical_note.assessment}</Text>
                      ) : null}
                      {visit.clinical_note.plan ? (
                        <Text style={styles.noteText}>P: {visit.clinical_note.plan}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.meta}>No SOAP notes.</Text>
                  )}
                  {visit.prescription?.items?.length ? (
                    <View>
                      <Text style={styles.subSection}>Prescription</Text>
                      {visit.prescription.items.map((item, i) => (
                        <Text key={i} style={styles.noteText}>
                          • {item.medicine_name}
                          {item.dosage ? ` ${item.dosage}` : ""}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {visit.rejection_reason ? (
                    <Text style={styles.rejectReason}>
                      Rejection: {visit.rejection_reason}
                    </Text>
                  ) : null}
                  <Pressable onPress={() => router.push(`/appointment/${visit.id}`)}>
                    <Text style={styles.link}>Open full visit →</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.tapHint}>Tap to expand</Text>
              )}
            </Pressable>
          );
        })
      ) : (
        <Empty title="No visits yet" />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  subSection: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  noteText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  visitCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  token: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  tapHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  rejectReason: {
    color: colors.danger,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
  },
  muted: {
    color: colors.muted,
  },
});
