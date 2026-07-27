import { useCallback, useState } from "react";
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
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { colors } from "@/constants/theme";

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

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [note, setNote] = useState<ClinicalNote>(emptyNote());
  const [rxNotes, setRxNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  async function saveClinical() {
    await api.saveClinicalNote(appointmentId, note);
    await api.savePrescription(appointmentId, {
      notes: rxNotes,
      items: items.filter((i) => i.medicine_name.trim()),
    });
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
              onPress={() => router.push(`/patient/${appointment.patient_uuid}`)}
            >
              <Text style={styles.link}>View patient history →</Text>
            </Pressable>
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
              onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))}
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  token: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    marginTop: 6,
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  muted: {
    color: colors.muted,
  },
});
