import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Badge, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, statusLabel, statusTone } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Appointment, VisitAttachment } from "@/lib/types";
import { colors, fonts } from "@/constants/theme";

function VoicePlayer({ attachment }: { attachment: VisitAttachment }) {
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

  function formatMs(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function toggle() {
    if (!uri) {
      setError("Audio file unavailable.");
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
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
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
      setError(e instanceof Error ? e.message : "Could not play audio");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.voiceCard}>
      <Pressable onPress={toggle} style={styles.playBtn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name={playing ? "pause" : "play"} size={22} color="#fff" />
        )}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.mediaTitle}>Voice note</Text>
        <Text style={styles.meta}>
          {formatMs(positionMs)} /{" "}
          {durationMs
            ? formatMs(durationMs)
            : attachment.duration_seconds
              ? formatMs(attachment.duration_seconds * 1000)
              : "--:--"}
        </Text>
        {error ? <Text style={styles.reject}>{error}</Text> : null}
      </View>
      <Ionicons name="mic" size={20} color={colors.primary} />
    </View>
  );
}

function ImageAttachment({
  attachment,
  onOpen,
}: {
  attachment: VisitAttachment;
  onOpen: (uri: string) => void;
}) {
  const uri = resolveMediaUrl(attachment.url);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={styles.imageFallback}>
        <Ionicons name="image-outline" size={28} color={colors.muted} />
        <Text style={styles.meta}>Could not load image</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={() => onOpen(uri)} style={{ gap: 6 }}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
      <Text style={styles.meta}>
        {attachment.original_name || "Image attachment"} · Tap to enlarge
      </Text>
    </Pressable>
  );
}

export default function VisitReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitId = Number(id);
  const [visit, setVisit] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(null);

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

  const attachments = visit.attachments || [];
  const images = attachments.filter((a) => a.kind === "image");
  const voices = attachments.filter((a) => a.kind === "voice");

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
              <Badge
                label={statusLabel(visit.status)}
                tone={statusTone(visit.status)}
              />
            </View>
            <Text style={styles.meta}>Date: {formatDate(visit.token_date)}</Text>
            <Text style={styles.meta}>
              Time: {formatDateTime(visit.scheduled_at)}
            </Text>
            {visit.notes ? (
              <Text style={styles.meta}>Notes: {visit.notes}</Text>
            ) : null}
            {visit.rejection_reason ? (
              <Text style={styles.reject}>Reason: {visit.rejection_reason}</Text>
            ) : null}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text style={styles.section}>Attachments from doctor</Text>
            {!attachments.length ? (
              <Text style={styles.meta}>
                No images or voice notes for this visit yet.
              </Text>
            ) : (
              <>
                {images.length ? (
                  <View style={{ gap: 12 }}>
                    <Text style={styles.subSection}>Images</Text>
                    {images.map((att) => (
                      <ImageAttachment
                        key={att.id}
                        attachment={att}
                        onOpen={setPreviewUri}
                      />
                    ))}
                  </View>
                ) : null}
                {voices.length ? (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.subSection}>Voice notes</Text>
                    {voices.map((att) => (
                      <VoicePlayer key={att.id} attachment={att} />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.previewWrap}>
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreviewUri(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
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
    fontFamily: fonts.sansExtra,
    fontSize: 16,
  },
  section: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.sansBold,
  },
  subSection: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.sans,
  },
  mediaTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.sansBold,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  imageFallback: {
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  reject: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: fonts.sansSemi,
    marginTop: 2,
  },
  previewWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    padding: 12,
  },
  previewClose: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 2,
    padding: 8,
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
});
