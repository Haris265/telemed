import { Pressable, Text, View } from "react-native";
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
import { useTheme } from "@/lib/theme";

function patientInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const { colors, fonts } = useTheme();

  const accentMap: Record<Appointment["status"], string> = {
    upcoming: colors.primary,
    completed: colors.success,
    rejected: colors.danger,
    cancelled: colors.warning,
  };
  const accent = accentMap[appointment.status] || colors.muted;
  const source = bookingSource(appointment.notes);

  return (
    <Pressable
      onPress={() => router.push(`/appointment/${appointment.id}`)}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          padding: 14,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${accent}22`,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: 15,
              color: accent,
            }}
          >
            {patientInitials(appointment.patient_name)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontFamily: fonts.sansBold,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {appointment.patient_name}
            </Text>
            <Badge
              label={statusLabel(appointment.status)}
              tone={statusTone(appointment.status)}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="call-outline" size={13} color={colors.muted} />
            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                flex: 1,
                fontFamily: fonts.sans,
              }}
            >
              {appointment.patient_phone}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                flex: 1,
                fontFamily: fonts.sans,
              }}
            >
              {formatDate(appointment.token_date)} ·{" "}
              {formatTime(appointment.scheduled_at)}
            </Text>
          </View>

          {detailed ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: `${accent}18`,
                  }}
                >
                  <Text
                    style={{
                      color: accent,
                      fontFamily: fonts.sansExtra,
                      fontSize: 14,
                    }}
                  >
                    {appointment.token_code}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    fontFamily: fonts.sansSemi,
                  }}
                >
                  Token #{appointment.token_number}
                </Text>
                {source ? <Badge label={source} tone="neutral" /> : null}
              </View>

              {appointment.rejection_reason ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginTop: 2,
                    fontStyle: "italic",
                    fontFamily: fonts.sans,
                  }}
                  numberOfLines={2}
                >
                  {appointment.rejection_reason}
                </Text>
              ) : null}
            </>
          ) : (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 2,
              }}
            >
              <Text
                style={{
                  color: accent,
                  fontFamily: fonts.sansExtra,
                  fontSize: 14,
                }}
              >
                {appointment.token_code}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  fontFamily: fonts.sansSemi,
                }}
              >
                #{appointment.token_number}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}
