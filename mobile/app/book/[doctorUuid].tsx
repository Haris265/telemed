import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { Badge, Button, Card, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { DateOption, Doctor } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function BookDoctorScreen() {
  const { doctorUuid, symptomCheckId } = useLocalSearchParams<{
    doctorUuid: string;
    symptomCheckId?: string;
  }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [weekly, setWeekly] = useState<
    { weekday_display: string; start_time: string; end_time: string }[]
  >([]);
  const [dates, setDates] = useState<DateOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!doctorUuid) return;
    setError("");
    try {
      const data = await api.doctorAvailability(String(doctorUuid));
      setDoctor(data.doctor);
      setWeekly(data.weekly);
      setDates(data.dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorUuid]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function confirm() {
    if (!doctor || !selected) return;
    setBooking(true);
    setError("");
    try {
      const checkId = symptomCheckId ? Number(symptomCheckId) : undefined;
      const res = await api.book(
        doctor.uuid,
        selected,
        Number.isFinite(checkId) ? { symptom_check_id: checkId } : undefined,
      );
      Alert.alert("Booked!", res.queue.message, [
        {
          text: "View queue",
          onPress: () => router.replace(`/appointment/${res.appointment.id}`),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  if (loading && !doctor) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!doctor) {
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
                setLoading(true);
                load();
              }}
            />
          }
        >
          <Empty title="Doctor not found" />
          <ErrorText>{error}</ErrorText>
        </ScrollView>
      </Screen>
    );
  }

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
        <Title>Dr. {doctor.full_name}</Title>
        <Subtitle>{doctor.session_time} min sessions</Subtitle>
        <ErrorText>{error}</ErrorText>

        <Text style={styles.section}>Weekly hours</Text>
        <Card style={{ gap: 8 }}>
          {!weekly.length ? (
            <Text style={styles.muted}>No weekly schedule set (defaults may apply).</Text>
          ) : (
            weekly.map((s, i) => (
              <Text key={i} style={styles.rowText}>
                {s.weekday_display}: {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </Text>
            ))
          )}
        </Card>

        <Text style={styles.section}>Available dates</Text>
        {!dates.length ? (
          <Empty title="No dates available" body="Try again later." />
        ) : (
          dates.map((d) => {
            const active = selected === d.date;
            return (
              <Pressable
                key={d.date}
                onPress={() => setSelected(d.date)}
                style={[styles.dateRow, active && styles.dateActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>{d.label}</Text>
                  <Text style={styles.muted}>{d.timing}</Text>
                </View>
                {active ? <Badge label="Selected" tone="success" /> : null}
              </Pressable>
            );
          })
        )}

        <View style={{ height: 16 }} />
        <Button
          label={booking ? "Booking…" : "Confirm booking"}
          onPress={confirm}
          loading={booking}
          disabled={!selected}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  muted: { color: colors.muted, fontSize: 13 },
  rowText: { color: colors.text, fontSize: 14 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  dateActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  dateLabel: { color: colors.text, fontWeight: "700" },
});
