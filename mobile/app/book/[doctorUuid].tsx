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
import type { DateOption, Doctor, DoctorClinicOption } from "@/lib/types";
import { colors, fonts } from "@/constants/theme";

function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 00:00 (or end <= start) = end of day / overnight → +24h */
function resolveEndMins(start: string, end: string) {
  const startMins = parseHm(start);
  let endMins = parseHm(end);
  if (endMins <= startMins) endMins += 24 * 60;
  return endMins;
}

function formatClock(totalMins: number) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Wall-clock "now" in Asia/Karachi (Pakistan). */
function pakistanParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    mins: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

type SlotStatus = "open" | "booked" | "past";

type SlotItem = {
  mins: number;
  time: string;
  label: string;
  status: SlotStatus;
};

function minsToTime(totalMins: number) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function buildSlotItemsFromWindows(
  windows: { start: string; end: string }[],
  sessionMins: number,
  opts?: { dateKey: string; bookedTimes?: string[] },
): SlotItem[] {
  const step = Math.max(sessionMins || 15, 5);
  const allSet = new Set<number>();
  for (const win of windows) {
    const startMins = parseHm(win.start);
    const endMins = resolveEndMins(win.start, win.end);
    for (let t = startMins; t + step <= endMins; t += step) {
      allSet.add(t);
    }
    if (!allSet.size && startMins < endMins) {
      allSet.add(startMins);
    }
  }
  const all = Array.from(allSet).sort((a, b) => a - b);

  const bookedSet = new Set(
    (opts?.bookedTimes || []).map((t) => t.slice(0, 8)),
  );
  const pk = pakistanParts();
  const isToday = !!opts?.dateKey && opts.dateKey === pk.dateKey;
  const nowMins = isToday ? pk.mins : -1;

  return all.map((mins) => {
    const time = minsToTime(mins);
    let status: SlotStatus = "open";
    if (bookedSet.has(time)) status = "booked";
    else if (isToday && mins <= nowMins) status = "past";
    return { mins, time, label: formatClock(mins), status };
  });
}

function windowsFor(option: DateOption) {
  if (option.windows?.length) return option.windows;
  return [{ start: option.start, end: option.end }];
}

function hasOpenSlot(
  option: DateOption,
  sessionMins: number,
) {
  return buildSlotItemsFromWindows(windowsFor(option), sessionMins, {
    dateKey: option.date,
    bookedTimes: option.booked_times,
  }).some((s) => s.status === "open");
}

export default function BookDoctorScreen() {
  const { doctorUuid, symptomCheckId, clinicId: clinicIdParam } =
    useLocalSearchParams<{
      doctorUuid: string;
      symptomCheckId?: string;
      clinicId?: string;
    }>();
  const router = useRouter();
  const presetClinicId = clinicIdParam ? Number(clinicIdParam) : NaN;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [clinics, setClinics] = useState<DoctorClinicOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(
    Number.isFinite(presetClinicId) ? presetClinicId : null,
  );
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

  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === selectedClinicId) ?? null,
    [clinics, selectedClinicId],
  );

  const openDates = useMemo(() => {
    if (!doctor) return [] as DateOption[];
    return dates.filter((d) => hasOpenSlot(d, doctor.session_time));
  }, [dates, doctor]);

  const availableSet = useMemo(() => new Set(dates.map((d) => d.date)), [dates]);

  const selectedOption = useMemo(
    () => dates.find((d) => d.date === selectedDate) ?? null,
    [dates, selectedDate],
  );

  const slotItems = useMemo(() => {
    if (!selectedOption || !doctor) return [] as SlotItem[];
    return buildSlotItemsFromWindows(
      windowsFor(selectedOption),
      doctor.session_time,
      {
        dateKey: selectedOption.date,
        bookedTimes: selectedOption.booked_times,
      },
    );
  }, [selectedOption, doctor]);

  const visibleSelectedSlot =
    selectedSlot &&
    slotItems.some((s) => s.time === selectedSlot && s.status === "open")
      ? selectedSlot
      : null;

  const pickDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    const d = parseDateKey(date);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const loadAvailability = useCallback(
    async (clinicId: number) => {
      const data = await api.doctorAvailability(String(doctorUuid), clinicId);
      setDoctor(data.doctor);
      setDates(data.dates);
      const withOpen = data.dates.filter((d) =>
        hasOpenSlot(d, data.doctor.session_time),
      );
      setSelectedDate((prev) => {
        if (prev && data.dates.some((d) => d.date === prev)) return prev;
        return withOpen[0]?.date ?? data.dates[0]?.date ?? null;
      });
      setSelectedSlot(null);
      const first = withOpen[0]?.date ?? data.dates[0]?.date;
      if (first) {
        const d = parseDateKey(first);
        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    },
    [doctorUuid],
  );

  const load = useCallback(async () => {
    if (!doctorUuid) return;
    setError("");
    try {
      const clinicsRes = await api.doctorClinics(String(doctorUuid));
      const list = clinicsRes.clinics.filter((c) => c.has_schedule !== false);
      const clinicList = list.length ? list : clinicsRes.clinics;
      setClinics(clinicList);

      let clinicId: number | null = null;
      if (Number.isFinite(presetClinicId)) {
        const preset = clinicList.find((c) => c.id === presetClinicId);
        if (preset) clinicId = preset.id;
      }
      if (!clinicId) {
        const primary = clinicList.find((c) => c.is_primary);
        clinicId = primary?.id ?? clinicList[0]?.id ?? null;
      }
      setSelectedClinicId(clinicId);

      if (!clinicId) {
        setDoctor(null);
        setDates([]);
        setError("This doctor has no clinic schedule yet.");
        return;
      }

      await loadAvailability(clinicId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorUuid, loadAvailability, presetClinicId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function onSelectClinic(id: number) {
    if (id === selectedClinicId) return;
    setSelectedClinicId(id);
    setSelectedDate(null);
    setSelectedSlot(null);
    setLoading(true);
    setError("");
    try {
      await loadAvailability(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!doctor || !selectedDate || !visibleSelectedSlot || !selectedClinicId) {
      return;
    }
    setBooking(true);
    setError("");
    try {
      const checkId = symptomCheckId ? Number(symptomCheckId) : undefined;
      const res = await api.book(doctor.uuid, selectedDate, {
        clinic_id: selectedClinicId,
        slot_time: visibleSelectedSlot,
        ...(Number.isFinite(checkId) ? { symptom_check_id: checkId } : {}),
      });
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

  if (loading && !doctor && !clinics.length) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!doctor && !loading) {
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
          <Empty
            title="Unavailable"
            body="Doctor has no clinic schedule yet."
          />
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
              if (selectedClinicId) {
                loadAvailability(selectedClinicId).finally(() =>
                  setRefreshing(false),
                );
              } else {
                load();
              }
            }}
          />
        }
      >
        <Title>Dr. {doctor?.full_name}</Title>
        <Subtitle>
          {doctor?.session_time ?? "—"} min sessions · Pakistan time (PKT)
        </Subtitle>
        <ErrorText>{error}</ErrorText>

        {clinics.length > 1 ? (
          <>
            <Text style={styles.section}>Clinic</Text>
            <View style={styles.clinicList}>
              {clinics.map((c) => {
                const active = c.id === selectedClinicId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onSelectClinic(c.id)}
                    style={[styles.clinicChip, active && styles.clinicChipActive]}
                  >
                    <Text
                      style={[
                        styles.clinicChipText,
                        active && styles.clinicChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                    {(c.area || c.city) ? (
                      <Text
                        style={[
                          styles.clinicMeta,
                          active && styles.clinicChipTextActive,
                        ]}
                      >
                        {[c.area, c.city].filter(Boolean).join(", ")}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : selectedClinic ? (
          <Text style={styles.clinicOneLine}>
            Clinic: {selectedClinic.name}
          </Text>
        ) : null}

        <Text style={styles.section}>Select date</Text>
        {!dates.length ? (
          <Empty
            title="No dates available"
            body="This clinic has no upcoming schedule days."
          />
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
              Slots
              {selectedOption ? ` · ${selectedOption.label}` : ""}
            </Text>
            {!slotItems.length ? (
              <Empty title="No slots" body="No timings set for this day." />
            ) : (
              <View style={styles.slotGrid}>
                {slotItems.map((slot) => {
                  const active = visibleSelectedSlot === slot.time;
                  const locked = slot.status !== "open";
                  return (
                    <Pressable
                      key={`${slot.time}-${slot.status}`}
                      disabled={locked}
                      onPress={() => setSelectedSlot(slot.time)}
                      style={[
                        styles.slot,
                        active && styles.slotActive,
                        slot.status === "booked" && styles.slotBooked,
                        slot.status === "past" && styles.slotPast,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          active && styles.slotTextActive,
                          slot.status === "booked" && styles.slotTextBooked,
                          slot.status === "past" && styles.slotTextPast,
                        ]}
                      >
                        {slot.label}
                      </Text>
                      {slot.status === "booked" ? (
                        <Text style={styles.slotBadge}>Booked</Text>
                      ) : null}
                      {slot.status === "past" ? (
                        <Text style={styles.slotBadgeMuted}>Past</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!openDates.some((d) => d.date === selectedDate) &&
            slotItems.length ? (
              <Text style={styles.hint}>
                No open slots left on this day — pick another date.
              </Text>
            ) : null}
          </>
        ) : null}

        <View style={{ height: 16 }} />
        <Button
          label={booking ? "Booking…" : "Confirm booking"}
          onPress={confirm}
          loading={booking}
          disabled={!selectedDate || !visibleSelectedSlot || !selectedClinicId}
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
  clinicList: { gap: 8 },
  clinicChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  clinicChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(15,118,110,0.12)",
  },
  clinicChipText: {
    color: colors.text,
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  clinicChipTextActive: {
    color: colors.primary,
  },
  clinicMeta: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  clinicOneLine: {
    marginTop: 12,
    color: colors.text,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
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
    gap: 2,
  },
  slotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  slotBooked: {
    borderColor: "#f0c2c2",
    backgroundColor: "#fdf2f2",
  },
  slotPast: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    opacity: 0.7,
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
  slotTextBooked: {
    color: colors.danger,
    textDecorationLine: "line-through",
  },
  slotTextPast: {
    color: colors.muted,
  },
  slotBadge: {
    fontSize: 10,
    color: colors.danger,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
  },
  slotBadgeMuted: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: fonts.sansSemi,
    textTransform: "uppercase",
  },
  hint: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.sans,
  },
});
