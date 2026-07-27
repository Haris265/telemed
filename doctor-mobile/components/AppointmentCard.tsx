import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/ui";
import type { Appointment } from "@/lib/types";
import {
  formatDate,
  formatTime,
  statusLabel,
  statusTone,
} from "@/lib/format";
import { colors } from "@/constants/theme";

function patientInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusAccent(status: Appointment["status"]) {
  const map: Record<Appointment["status"], string> = {
    upcoming: colors.primary,
    completed: colors.success,
    rejected: colors.danger,
    cancelled: colors.warning,
  };
  return map[status] || colors.muted;
}

function bookingSource(notes: string) {
  if (!notes || notes === "Booked via App" || notes === "Booked via WhatsApp") {
    return notes.replace("Booked via ", "") || null;
  }
  return null;
}

export function AppointmentCard({
  appointment,
  detailed = false,
}: {
  appointment: Appointment;
  detailed?: boolean;
}) {
  const router = useRouter();
  const accent = statusAccent(appointment.status);
  const source = bookingSource(appointment.notes);

  return (
    <Pressable
      onPress={() => router.push(`/appointment/${appointment.id}`)}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: accent, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: `${accent}22` }]}>
          <Text style={[styles.avatarText, { color: accent }]}>
            {patientInitials(appointment.patient_name)}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {appointment.patient_name}
            </Text>
            <Badge
              label={statusLabel(appointment.status)}
              tone={statusTone(appointment.status)}
            />
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={13} color={colors.muted} />
            <Text style={styles.meta}>{appointment.patient_phone}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
            <Text style={styles.meta}>
              {formatDate(appointment.token_date)} ·{" "}
              {formatTime(appointment.scheduled_at)}
            </Text>
          </View>

          {detailed ? (
            <>
              <View style={styles.tokenRow}>
                <View style={[styles.tokenPill, { backgroundColor: `${accent}18` }]}>
                  <Text style={[styles.tokenCode, { color: accent }]}>
                    {appointment.token_code}
                  </Text>
                </View>
                <Text style={styles.tokenNum}>Token #{appointment.token_number}</Text>
                {source ? (
                  <Badge label={source} tone="neutral" />
                ) : null}
              </View>

              {appointment.rejection_reason ? (
                <Text style={styles.rejectNote} numberOfLines={2}>
                  {appointment.rejection_reason}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.tokenRow}>
              <Text style={[styles.tokenCode, { color: accent }]}>
                {appointment.token_code}
              </Text>
              <Text style={styles.tokenNum}>#{appointment.token_number}</Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 15,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    flex: 1,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  tokenPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tokenCode: {
    fontWeight: "800",
    fontSize: 14,
  },
  tokenNum: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  rejectNote: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 2,
    fontStyle: "italic",
  },
});
