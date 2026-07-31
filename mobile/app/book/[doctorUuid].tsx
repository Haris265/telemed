import { useCallback, useMemo, useState } from "react";
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

import { MonthCalendar, parseDateKey } from "@/components/MonthCalendar";
import { Button, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { DateOption, Doctor } from "@/lib/types";
import { colors, fonts } from "@/constants/theme";

function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatClock(totalMins: number) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function buildSlots(start: string, end: string, sessionMins: number) {
  const step = Math.max(sessionMins || 15, 5);
  const startMins = parseHm(start);
  const endMins = parseHm(end);
  const slots: string[] = [];
  for (let t = startMins; t + step <= endMins; t += step) {
    slots.push(formatClock(t));
  }
  if (!slots.length && startMins < endMins) {
    slots.push(formatClock(startMins));
  }
  return slots;
}

export default function BookDoctorScreen() {
  const { doctorUuid, symptomCheckId } = useLocalSearchParams<{
    doctorUuid: string;
    symptomCheckId?: string;
  }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [dates, setDates] = useState<DateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const availableSet = useMemo(
    () => new Set(dates.map((d) => d.date)),
    [dates],
  );

  const selectedOption = useMemo(
    () => dates.find((d) => d.date === selectedDate) ?? null,
    [dates, selectedDate],
  );

  const slots = useMemo(() => {
    if (!selectedOption || !doctor) return [];
    return buildSlots(
      selectedOption.start,
      selectedOption.end,
      doctor.session_time,
    );
  }, [selectedOption, doctor]);

  const pickDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    const d = parseDateKey(date);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const load = useCallback(async () => {
    if (!doctorUuid) return;
    setError("");
    try {
      const data = await api.doctorAvailability(String(doctorUuid));
      setDoctor(data.doctor);
      setDates(data.dates);
      setSelectedDate((prev) => {
        if (prev && data.dates.some((d) => d.date === prev)) return prev;
        return data.dates[0]?.date ?? null;
      });
      setSelectedSlot(null);
      const first = data.dates[0]?.date;
      if (first) {
        const d = parseDateKey(first);
        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
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
    if (!doctor || !selectedDate || !selectedSlot) return;
    setBooking(true);
    setError("");
    try {
      const checkId = symptomCheckId ? Number(symptomCheckId) : undefined;
      const res = await api.book(
        doctor.uuid,
        selectedDate,
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

        <Text style={styles.section}>Select date</Text>
        {!dates.length ? (
          <Empty title="No dates available" body="Try again later." />
        ) : (
          <MonthCalendar
            availableDates={availableSet}
            selected={selectedDate}
            onSelect={pickDate}
            month={month}
            onMonthChange={setMonth}
          />
        )}

        {selectedDate ? (
          <>
            <Text style={styles.section}>
              Available slots
              {selectedOption ? ` · ${selectedOption.label}` : ""}
            </Text>
            {!slots.length ? (
              <Empty title="No slots" body="Nothing open on this day." />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => {
                  const active = selectedSlot === slot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setSelectedSlot(slot)}
                      style={[styles.slot, active && styles.slotActive]}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: 16 }} />
        <Button
          label={booking ? "Booking…" : "Confirm booking"}
          onPress={confirm}
          loading={booking}
          disabled={!selectedDate || !selectedSlot}
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
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slot: {
    minWidth: "30%",
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  slotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  slotText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.sansSemi,
  },
  slotTextActive: {
    color: "#fff",
    fontFamily: fonts.sansBold,
  },
});
