import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";

import { LoadingState } from "@/components/LoadingState";
import {
  Button,
  Card,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  Title,
  useThemedStyles,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  AvailabilitySlot,
  ClinicFormPayload,
  DoctorClinic,
  ScheduleSlotInput,
} from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

const WEEKDAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

type DayDraft = {
  enabled: boolean;
  start_time: string;
  end_time: string;
};

function toHm(value: string) {
  // Accept "09:00:00" or "09:00"
  const parts = value.split(":");
  if (parts.length < 2) return "09:00";
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

function toApiTime(value: string) {
  const hm = toHm(value.trim());
  return `${hm}:00`;
}

function defaultDraft(): Record<number, DayDraft> {
  return Object.fromEntries(
    WEEKDAYS.map((d) => [
      d.value,
      { enabled: false, start_time: "09:00", end_time: "17:00" },
    ]),
  );
}

function slotsToDraft(slots: AvailabilitySlot[]): Record<number, DayDraft> {
  const draft = defaultDraft();
  for (const slot of slots) {
    draft[slot.weekday] = {
      enabled: slot.is_active,
      start_time: toHm(slot.start_time),
      end_time: toHm(slot.end_time),
    };
  }
  return draft;
}

export default function ClinicScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clinicLinkId = Number(id);
  const { colors, fonts } = useTheme();
  const styles = useThemedStyles((c, f) => ({
    dayRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dayLabel: {
      width: 40,
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 14,
    },
    timeField: { flex: 1 },
    hint: {
      color: c.muted,
      fontSize: 12,
      fontFamily: f.sans,
      marginTop: 8,
    },
  }));

  const [link, setLink] = useState<DoctorClinic | null>(null);
  const [draft, setDraft] = useState<Record<number, DayDraft>>(defaultDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClinicFormPayload>({
    name: "",
    address: "",
    city: "",
    area: "",
    phone: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [clinic, slots] = await Promise.all([
      api.clinic(clinicLinkId),
      api.clinicAvailability(clinicLinkId),
    ]);
    setLink(clinic);
    setDraft(slotsToDraft(slots));
  }, [clinicLinkId]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  const title = useMemo(
    () => link?.clinic.name || "Clinic schedule",
    [link?.clinic.name],
  );

  function updateDay(weekday: number, patch: Partial<DayDraft>) {
    setDraft((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], ...patch },
    }));
  }

  async function onSave() {
    const slots: ScheduleSlotInput[] = [];
    for (const day of WEEKDAYS) {
      const row = draft[day.value];
      if (!row?.enabled) continue;
      const start = toHm(row.start_time);
      const end = toHm(row.end_time);
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
        setSaveError(`Invalid time on ${day.label}. Use HH:MM (e.g. 09:00).`);
        return;
      }
      if (end !== "00:00" && start >= end) {
        setSaveError(`${day.label}: end time must be after start time.`);
        return;
      }
      slots.push({
        weekday: day.value,
        start_time: toApiTime(start),
        end_time: toApiTime(end),
        is_active: true,
      });
    }

    setSaving(true);
    setSaveError(null);
    try {
      await api.replaceClinicAvailability(clinicLinkId, slots);
      Alert.alert("Saved", "Clinic schedule updated.");
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function onMakePrimary() {
    if (!link || link.is_primary) return;
    try {
      const updated = await api.updateClinic(link.id, { is_primary: true });
      setLink(updated);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not update primary clinic.",
      );
    }
  }

  function openEdit() {
    if (!link) return;
    setEditForm({
      name: link.clinic.name,
      address: link.clinic.address,
      city: link.clinic.city || "",
      area: link.clinic.area || "",
      phone: link.clinic.phone || "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function onSaveClinicDetails() {
    if (!link) return;
    if (!editForm.name.trim() || !editForm.address.trim()) {
      setEditError("Clinic name and address are required.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await api.updateClinic(link.id, {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        city: editForm.city?.trim() || "",
        area: editForm.area?.trim() || "",
        phone: editForm.phone?.trim() || "",
      });
      setLink(updated);
      setEditOpen(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not update clinic.");
    } finally {
      setEditSaving(false);
    }
  }

  function onDeleteClinic() {
    if (!link) return;
    Alert.alert(
      "Delete clinic",
      `Delete "${link.clinic.name}" and its schedule?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteClinic(link.id);
              router.replace("/(tabs)/clinics");
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Could not delete clinic.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!Number.isFinite(clinicLinkId)) {
    return (
      <Screen>
        <ErrorText>Invalid clinic.</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: "Clinic schedule" }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={onRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Title>{title}</Title>
        <Subtitle>
          Toggle days you work here and set open hours (24h, e.g. 09:00–17:00).
        </Subtitle>

        <View style={{ height: 16 }} />

        {error ? <ErrorText>{error}</ErrorText> : null}

        {loading && !link ? (
          <LoadingState label="Loading schedule…" />
        ) : (
          <>
            {link ? (
              <Card style={{ marginBottom: 14, gap: 4 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {link.clinic.address}
                </Text>
                {(link.clinic.area || link.clinic.city) && (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {[link.clinic.area, link.clinic.city]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
                {link.clinic.phone ? (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {link.clinic.phone}
                  </Text>
                ) : null}
                {!link.is_primary ? (
                  <Pressable onPress={onMakePrimary} style={{ marginTop: 8 }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.sansBold,
                        fontSize: 13,
                      }}
                    >
                      Set as primary clinic
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: colors.primary,
                      marginTop: 6,
                      fontSize: 12,
                      fontFamily: fonts.sansBold,
                    }}
                  >
                    Primary clinic
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button label="Edit clinic" variant="secondary" onPress={openEdit} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Delete"
                      variant="danger"
                      loading={deleting}
                      onPress={onDeleteClinic}
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            <Card>
              {WEEKDAYS.map((day) => {
                const row = draft[day.value];
                return (
                  <View key={day.value} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Switch
                      value={row.enabled}
                      onValueChange={(enabled) =>
                        updateDay(day.value, { enabled })
                      }
                      trackColor={{
                        false: colors.border,
                        true: colors.primary,
                      }}
                    />
                    <View style={styles.timeField}>
                      <Input
                        value={row.start_time}
                        editable={row.enabled}
                        onChangeText={(start_time) =>
                          updateDay(day.value, { start_time })
                        }
                        placeholder="09:00"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={styles.timeField}>
                      <Input
                        value={row.end_time}
                        editable={row.enabled}
                        onChangeText={(end_time) =>
                          updateDay(day.value, { end_time })
                        }
                        placeholder="17:00"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                );
              })}
              <Text style={styles.hint}>
                Times are Pakistan (PKT). Off days stay closed. Use 00:00 as end
                time for midnight.
              </Text>
            </Card>

            <ErrorText>{saveError}</ErrorText>
            <View style={{ height: 16 }} />
            <Button label="Save schedule" loading={saving} onPress={onSave} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontFamily: fonts.serifBold,
                }}
              >
                Edit clinic
              </Text>
              <View style={{ height: 12 }} />
              <Input
                label="Clinic name"
                value={editForm.name}
                onChangeText={(name) => setEditForm((f) => ({ ...f, name }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Address"
                value={editForm.address}
                onChangeText={(address) =>
                  setEditForm((f) => ({ ...f, address }))
                }
              />
              <View style={{ height: 10 }} />
              <Input
                label="City"
                value={editForm.city}
                onChangeText={(city) => setEditForm((f) => ({ ...f, city }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Area"
                value={editForm.area}
                onChangeText={(area) => setEditForm((f) => ({ ...f, area }))}
              />
              <View style={{ height: 10 }} />
              <Input
                label="Phone"
                value={editForm.phone}
                onChangeText={(phone) => setEditForm((f) => ({ ...f, phone }))}
                keyboardType="phone-pad"
              />
              <ErrorText>{editError}</ErrorText>
              <View style={{ height: 16 }} />
              <Button
                label="Update clinic"
                loading={editSaving}
                onPress={onSaveClinicDetails}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setEditOpen(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
