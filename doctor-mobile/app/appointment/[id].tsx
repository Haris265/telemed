import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { LoadingState } from "@/components/LoadingState";
import { Badge, Button, Card, ErrorText, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment, VisitAttachment } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/mediaUrl";
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

function formatAudioMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VoiceNotePlayer({
  attachment,
  colors,
  fonts,
}: {
  attachment: VisitAttachment;
  colors: { primary: string; text: string; muted: string; danger: string };
  fonts: { sansBold: string; sans: string };
}) {
  const uri = resolveMediaUrl(attachment.url);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    (attachment.duration_seconds || 0) * 1000,
  );

  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => undefined);
    };
  }, [sound]);

  async function toggle() {
    if (!uri) {
      setError("Audio unavailable.");
      return;
    }
    setError("");
    try {
      if (playing && sound) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound) {
        await sound.playAsync();
        setPlaying(true);
        return;
      }
      setLoading(true);
      // Stop recording mode so playback works reliably.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound: created } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis || 0);
          if (status.durationMillis) setDurationMs(status.durationMillis);
          if (status.didJustFinish) {
            setPlaying(false);
            setPositionMs(0);
          }
        },
      );
      setSound(created);
      setPlaying(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not play");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={toggle}
          disabled={loading}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={playing ? "pause" : "play"} size={20} color="#fff" />
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.sansBold,
              fontSize: 14,
            }}
          >
            Voice note
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.sans,
              fontSize: 12,
            }}
          >
            {formatAudioMs(positionMs)} /{" "}
            {durationMs
              ? formatAudioMs(durationMs)
              : attachment.duration_seconds
                ? formatAudioMs(attachment.duration_seconds * 1000)
                : "--:--"}
          </Text>
          {error ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 12,
                fontFamily: fonts.sans,
              }}
            >
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = Number(id);
  const { colors, fonts } = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
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
        hint: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
          lineHeight: 18,
        },
        actions: { gap: 10, marginTop: 8 },
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
        mediaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        thumb: {
          width: 64,
          height: 64,
          borderRadius: 10,
          backgroundColor: colors.surfaceAlt,
        },
        mediaTitle: {
          color: colors.text,
          fontFamily: fonts.sansSemi,
          fontSize: 14,
          flex: 1,
        },
        mediaMeta: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sans,
        },
        recordBadge: {
          color: colors.danger,
          fontFamily: fonts.sansBold,
          fontSize: 14,
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    if (!appointmentId) return;
    const data = await api.appointment(appointmentId);
    setAppointment(data);
    setAttachments(data.attachments || []);
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

  useEffect(() => {
    return () => {
      if (recordTimer.current) clearInterval(recordTimer.current);
      recording?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [recording]);

  const liveDurationSeconds = useMemo(() => {
    if (!appointment?.visit_started_at) return null;
    const start = new Date(appointment.visit_started_at).getTime();
    const end = appointment.visit_ended_at
      ? new Date(appointment.visit_ended_at).getTime()
      : nowTick;
    return Math.max(0, Math.floor((end - start) / 1000));
  }, [appointment?.visit_started_at, appointment?.visit_ended_at, nowTick]);

  async function onStartVisit() {
    setTimingLoading(true);
    setError("");
    try {
      const updated = await api.startVisit(appointmentId);
      setAppointment(updated);
      setAttachments(updated.attachments || []);
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
      setAttachments(updated.attachments || []);
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
      const updated = await api.updateAppointmentStatus(appointmentId, {
        status: "completed",
      });
      setAppointment(updated);
      setAttachments(updated.attachments || []);
      Alert.alert("Done", "Visit completed. Media sent to the patient.");
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

  async function pickImage(fromCamera: boolean) {
    setError("");
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Camera / gallery permission is required.");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.75,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.75,
        });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadLoading(true);
    try {
      const att = await api.uploadAttachment(appointmentId, {
        kind: "image",
        uri: asset.uri,
        name: asset.fileName || "photo.jpg",
        mimeType: asset.mimeType || "image/jpeg",
      });
      setAttachments((prev) => [...prev, att]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  async function startRecording() {
    setError("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is required.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setRecordingMs(0);
      recordTimer.current = setInterval(() => {
        setRecordingMs((ms) => ms + 1000);
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
    }
  }

  async function stopRecordingAndUpload() {
    if (!recording) return;
    setUploadLoading(true);
    setError("");
    try {
      if (recordTimer.current) {
        clearInterval(recordTimer.current);
        recordTimer.current = null;
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const durationSec =
        status.isLoaded && status.durationMillis
          ? Math.round(status.durationMillis / 1000)
          : Math.round(recordingMs / 1000);
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) throw new Error("No recording file created.");
      const att = await api.uploadAttachment(appointmentId, {
        kind: "voice",
        uri,
        name: "voice.m4a",
        mimeType: "audio/m4a",
        durationSeconds: durationSec,
      });
      setAttachments((prev) => [...prev, att]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice upload failed");
      setRecording(null);
    } finally {
      setUploadLoading(false);
      setRecordingMs(0);
    }
  }

  function onDeleteAttachment(att: VisitAttachment) {
    Alert.alert("Delete attachment", `Remove this ${att.kind}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteAttachment(appointmentId, att.id);
            setAttachments((prev) => prev.filter((a) => a.id !== att.id));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
          }
        },
      },
    ]);
  }

  const isEditable = appointment?.status === "upcoming";
  const canStart = isEditable && !appointment?.visit_started_at;
  const canEnd = isEditable && visitInProgress;
  const canAttach = appointment?.status === "upcoming" || appointment?.status === "completed";

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
                <Text style={styles.hint}>
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

            <Text style={styles.section}>Patient media</Text>
            <Text style={styles.hint}>
              Attach an image or voice note for this patient. They will see it
              in the app and receive it on WhatsApp when you complete the visit.
            </Text>

            {canAttach ? (
              <View style={styles.actions}>
                <Button
                  label="Take photo"
                  variant="secondary"
                  loading={uploadLoading}
                  onPress={() => pickImage(true)}
                />
                <Button
                  label="Choose image"
                  variant="secondary"
                  loading={uploadLoading}
                  onPress={() => pickImage(false)}
                />
                {recording ? (
                  <Button
                    label={`Stop & upload (${Math.floor(recordingMs / 1000)}s)`}
                    loading={uploadLoading}
                    onPress={stopRecordingAndUpload}
                  />
                ) : (
                  <Button
                    label="Record voice note"
                    variant="secondary"
                    loading={uploadLoading}
                    onPress={startRecording}
                  />
                )}
                {recording ? (
                  <Text style={styles.recordBadge}>Recording…</Text>
                ) : null}
              </View>
            ) : null}

            {attachments.length ? (
              <View style={{ gap: 10 }}>
                {attachments.map((att) => (
                  <Card key={att.id}>
                    <View style={styles.mediaRow}>
                      {att.kind === "image" ? (
                        <>
                          <Image
                            source={{ uri: resolveMediaUrl(att.url) }}
                            style={styles.thumb}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.mediaTitle}>Image</Text>
                            <Text style={styles.mediaMeta}>
                              {att.original_name || att.mime_type}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <VoiceNotePlayer
                          attachment={att}
                          colors={colors}
                          fonts={fonts}
                        />
                      )}
                      {canAttach ? (
                        <Pressable onPress={() => onDeleteAttachment(att)}>
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={colors.danger}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Card>
                <Text style={styles.hint}>No media attached yet.</Text>
              </Card>
            )}

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
