import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { LoadingState } from "@/components/LoadingState";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Input,
  TextArea,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment, ClinicalNote, PrescriptionItem } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  statusLabel,
  statusTone,
} from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

const emptyNote = (): ClinicalNote => ({
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
});

const emptyItem = (): PrescriptionItem => ({
  medicine_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = Number(id);
  const { colors, fonts } = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [note, setNote] = useState<ClinicalNote>(emptyNote());
  const [rxNotes, setRxNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        scroll: { flex: 1, zIndex: 1 },
        content: { padding: 16, gap: 12, paddingBottom: 40 },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        token: {
          color: colors.primary,
          fontFamily: fonts.sansExtra,
          fontSize: 18,
        },
        name: {
          color: colors.text,
          fontSize: 18,
          fontFamily: fonts.sansBold,
        },
        meta: {
          color: colors.muted,
          fontSize: 14,
          fontFamily: fonts.sans,
        },
        link: {
          color: colors.primary,
          fontFamily: fonts.sansSemi,
          marginTop: 6,
        },
        section: {
          color: colors.text,
          fontSize: 17,
          fontFamily: fonts.sansBold,
          marginTop: 8,
        },
        itemTitle: {
          color: colors.text,
          fontFamily: fonts.sansBold,
        },
        actions: {
          gap: 10,
          marginTop: 8,
        },
        timingLabel: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        timingValue: {
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansBold,
          marginTop: 2,
        },
        duration: {
          color: colors.primary,
          fontSize: 28,
          fontFamily: fonts.sansExtra,
          letterSpacing: -0.5,
        },
        timingHint: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
          lineHeight: 18,
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    if (!appointmentId) return;
    const data = await api.appointment(appointmentId);
    setAppointment(data);
    setNote(data.clinical_note || emptyNote());
    setRxNotes(data.prescription?.notes || "");
    setItems(
      data.prescription?.items?.length
        ? data.prescription.items
        : [emptyItem()],
    );
    setRejectionReason(data.rejection_reason || "");
  }, [appointmentId]);

  const { refreshing, loading, error, setError, onRefresh } = useScreenData(load);

  const visitInProgress = Boolean(
    appointment?.visit_started_at && !appointment?.visit_ended_at,
  );

  useEffect(() => {
    if (!visitInProgress) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visitInProgress]);

  const liveDurationSeconds = useMemo(() => {
    if (!appointment?.visit_started_at) return null;
    const start = new Date(appointment.visit_started_at).getTime();
    const end = appointment.visit_ended_at
      ? new Date(appointment.visit_ended_at).getTime()
      : nowTick;
    return Math.max(0, Math.floor((end - start) / 1000));
  }, [appointment?.visit_started_at, appointment?.visit_ended_at, nowTick]);

  async function saveClinical() {
    await api.saveClinicalNote(appointmentId, note);
    await api.savePrescription(appointmentId, {
      notes: rxNotes,
      items: items.filter((i) => i.medicine_name.trim()),
    });
  }

  async function onStartVisit() {
    setTimingLoading(true);
    setError("");
    try {
      const updated = await api.startVisit(appointmentId);
      setAppointment(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start visit");
    } finally {
      setTimingLoading(false);
    }
  }

  async function onEndVisit() {
    setTimingLoading(true);
    setError("");
    try {
      const updated = await api.endVisit(appointmentId);
      setAppointment(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end visit");
    } finally {
      setTimingLoading(false);
    }
  }

  async function onComplete() {
    setActionLoading(true);
    setError("");
    try {
      await saveClinical();
      const updated = await api.updateAppointmentStatus(appointmentId, {
        status: "completed",
      });
      setAppointment(updated);
      Alert.alert("Done", "Visit marked as completed.");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete visit");
    } finally {
      setActionLoading(false);
    }
  }

  function onReject() {
    Alert.alert(
      "Reject visit",
      "Mark this appointment as rejected? You can add an optional reason.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            setError("");
            try {
              await saveClinical();
              const updated = await api.updateAppointmentStatus(appointmentId, {
                status: "rejected",
                rejection_reason: rejectionReason,
              });
              setAppointment(updated);
              Alert.alert("Rejected", "Appointment marked as rejected.");
              router.back();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Failed to reject appointment",
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function updateItem(index: number, field: keyof PrescriptionItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  const isEditable = appointment?.status === "upcoming";
  const canStart = isEditable && !appointment?.visit_started_at;
  const canEnd = isEditable && visitInProgress;

  return (
    <View style={styles.root}>
      <ClinicBackdrop />
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
        {loading && !refreshing && !appointment ? (
          <LoadingState label="Loading visit…" />
        ) : (
          <>
            {appointment ? (
              <Card style={{ gap: 8 }}>
                <View style={styles.row}>
                  <Text style={styles.token}>{appointment.token_code}</Text>
                  <Badge
                    label={statusLabel(appointment.status)}
                    tone={statusTone(appointment.status)}
                  />
                </View>
                <Text style={styles.name}>{appointment.patient_name}</Text>
                <Text style={styles.meta}>{appointment.patient_phone}</Text>
                <Text style={styles.meta}>
                  {formatDate(appointment.token_date)} ·{" "}
                  {formatDateTime(appointment.scheduled_at)}
                </Text>
                {appointment.patient_uuid ? (
                  <Pressable
                    onPress={() =>
                      router.push(`/patient/${appointment.patient_uuid}`)
                    }
                  >
                    <Text style={styles.link}>View patient history →</Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}

            {appointment ? (
              <Card style={{ gap: 12 }}>
                <Text style={[styles.section, { marginTop: 0 }]}>Visit timing</Text>
                <Text style={styles.timingHint}>
                  Tap Start when you begin seeing the patient, then End when the
                  consultation finishes.
                </Text>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timingLabel}>Start time</Text>
                    <Text style={styles.timingValue}>
                      {appointment.visit_started_at
                        ? formatTime(appointment.visit_started_at)
                        : "—"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timingLabel}>End time</Text>
                    <Text style={styles.timingValue}>
                      {appointment.visit_ended_at
                        ? formatTime(appointment.visit_ended_at)
                        : "—"}
                    </Text>
                  </View>
                </View>

                {liveDurationSeconds != null ? (
                  <View>
                    <Text style={styles.timingLabel}>
                      {visitInProgress ? "Elapsed" : "Duration"}
                    </Text>
                    <Text style={styles.duration}>
                      {formatDuration(liveDurationSeconds)}
                    </Text>
                  </View>
                ) : null}

                {canStart || canEnd ? (
                  <View style={styles.actions}>
                    {canStart ? (
                      <Button
                        label="Start visit"
                        onPress={onStartVisit}
                        loading={timingLoading}
                      />
                    ) : null}
                    {canEnd ? (
                      <Button
                        label="End visit"
                        variant="secondary"
                        onPress={onEndVisit}
                        loading={timingLoading}
                      />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ) : null}

            <Text style={styles.section}>SOAP Notes</Text>
            <TextArea
              label="Subjective"
              value={note.subjective}
              onChangeText={(v) => setNote((n) => ({ ...n, subjective: v }))}
              editable={isEditable}
              placeholder="Patient complaints, symptoms..."
            />
            <TextArea
              label="Objective"
              value={note.objective}
              onChangeText={(v) => setNote((n) => ({ ...n, objective: v }))}
              editable={isEditable}
              placeholder="Exam findings, vitals..."
            />
            <TextArea
              label="Assessment"
              value={note.assessment}
              onChangeText={(v) => setNote((n) => ({ ...n, assessment: v }))}
              editable={isEditable}
              placeholder="Diagnosis, clinical impression..."
            />
            <TextArea
              label="Plan"
              value={note.plan}
              onChangeText={(v) => setNote((n) => ({ ...n, plan: v }))}
              editable={isEditable}
              placeholder="Treatment plan, follow-up..."
            />

            <Text style={styles.section}>Prescription</Text>
            <TextArea
              label="General instructions"
              value={rxNotes}
              onChangeText={setRxNotes}
              editable={isEditable}
              placeholder="Diet, rest, follow-up..."
            />

            {items.map((item, index) => (
              <Card key={index} style={{ gap: 10 }}>
                <Text style={styles.itemTitle}>Medicine {index + 1}</Text>
                <Input
                  label="Medicine name"
                  value={item.medicine_name}
                  onChangeText={(v) => updateItem(index, "medicine_name", v)}
                  editable={isEditable}
                  placeholder="e.g. Paracetamol"
                />
                <Input
                  label="Dosage"
                  value={item.dosage}
                  onChangeText={(v) => updateItem(index, "dosage", v)}
                  editable={isEditable}
                  placeholder="e.g. 500mg"
                />
                <Input
                  label="Frequency"
                  value={item.frequency}
                  onChangeText={(v) => updateItem(index, "frequency", v)}
                  editable={isEditable}
                  placeholder="e.g. twice daily"
                />
                <Input
                  label="Duration"
                  value={item.duration}
                  onChangeText={(v) => updateItem(index, "duration", v)}
                  editable={isEditable}
                  placeholder="e.g. 7 days"
                />
                <Input
                  label="Instructions"
                  value={item.instructions}
                  onChangeText={(v) => updateItem(index, "instructions", v)}
                  editable={isEditable}
                  placeholder="After meals, etc."
                />
                {isEditable && items.length > 1 ? (
                  <Button
                    label="Remove medicine"
                    variant="secondary"
                    onPress={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                  />
                ) : null}
              </Card>
            ))}

            {isEditable ? (
              <Button
                label="Add medicine"
                variant="secondary"
                onPress={() => setItems((prev) => [...prev, emptyItem()])}
              />
            ) : null}

            {isEditable ? (
              <>
                <TextArea
                  label="Rejection reason (optional)"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="No-show, declined consultation..."
                />
                <View style={styles.actions}>
                  <Button
                    label="Complete visit"
                    onPress={onComplete}
                    loading={actionLoading}
                  />
                  <Button
                    label="Reject"
                    variant="danger"
                    onPress={onReject}
                    loading={actionLoading}
                  />
                </View>
              </>
            ) : null}

            <ErrorText>{error}</ErrorText>
          </>
        )}
      </ScrollView>
    </View>
  );
}
