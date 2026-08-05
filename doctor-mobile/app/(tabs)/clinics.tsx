import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { LoadingState } from "@/components/LoadingState";
import {
  Button,
  Card,
  Empty,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  Title,
  useThemedStyles,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { ClinicFormPayload, DoctorClinic } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

const emptyForm: ClinicFormPayload = {
  name: "",
  address: "",
  city: "",
  area: "",
  phone: "",
  is_primary: false,
};

function clinicToForm(item: DoctorClinic): ClinicFormPayload {
  return {
    name: item.clinic.name,
    address: item.clinic.address,
    city: item.clinic.city || "",
    area: item.clinic.area || "",
    phone: item.clinic.phone || "",
    is_primary: item.is_primary,
  };
}

export default function ClinicsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, f) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    name: {
      color: c.text,
      fontSize: 17,
      fontFamily: f.sansBold,
      flex: 1,
    },
    meta: {
      color: c.muted,
      fontSize: 13,
      fontFamily: f.sans,
      marginTop: 4,
      lineHeight: 18,
    },
    badge: {
      backgroundColor: "rgba(15,118,110,0.12)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: {
      color: c.primary,
      fontSize: 11,
      fontFamily: f.sansBold,
    },
    actions: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
    },
    actionDanger: {
      borderColor: "rgba(185,28,28,0.35)",
      backgroundColor: "rgba(185,28,28,0.08)",
    },
    actionText: {
      color: c.text,
      fontSize: 13,
      fontFamily: f.sansSemi,
    },
    actionDangerText: {
      color: c.danger,
      fontSize: 13,
      fontFamily: f.sansSemi,
    },
    scheduleLink: {
      marginTop: 10,
      color: c.primary,
      fontSize: 13,
      fontFamily: f.sansBold,
    },
    modalWrap: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      justifyContent: "flex-end" as const,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      gap: 12,
      maxHeight: "90%" as const,
    },
    modalTitle: {
      color: c.text,
      fontSize: 20,
      fontFamily: f.serifBold,
    },
  }));

  const [clinics, setClinics] = useState<DoctorClinic[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorClinic | null>(null);
  const [form, setForm] = useState<ClinicFormPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.clinics();
    setClinics(data);
  }, []);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: DoctorClinic) {
    setEditing(item);
    setForm(clinicToForm(item));
    setFormError(null);
    setModalOpen(true);
  }

  async function onSave() {
    if (!form.name.trim() || !form.address.trim()) {
      setFormError("Clinic name and address are required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city?.trim() || "",
      area: form.area?.trim() || "",
      phone: form.phone?.trim() || "",
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.updateClinic(editing.id, payload);
      } else {
        await api.createClinic({
          ...payload,
          is_primary: clinics.length === 0,
        });
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save clinic.");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(item: DoctorClinic) {
    Alert.alert(
      "Delete clinic",
      `Delete "${item.clinic.name}" and its schedule? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteClinic(item.id);
              await load();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Could not delete clinic.",
              );
            }
          },
        },
      ],
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
            onRefresh={onRefresh}
          />
        }
      >
        <Title>My Clinics</Title>
        <Subtitle>
          Add clinics where you practice and set weekly timings for each.
        </Subtitle>

        <View style={{ height: 16 }} />
        <Button label="Add clinic" onPress={openCreate} />

        <View style={{ height: 16 }} />
        {error ? <ErrorText>{error}</ErrorText> : null}

        {loading && !refreshing && clinics.length === 0 ? (
          <LoadingState label="Loading clinics…" />
        ) : clinics.length === 0 ? (
          <Empty
            title="No clinics yet"
            body="Add your clinic address, then set open hours so patients can book."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {clinics.map((item) => (
              <Card key={item.id}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.clinic.name}</Text>
                  {item.is_primary ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  {[item.clinic.area, item.clinic.city]
                    .filter(Boolean)
                    .join(", ") || item.clinic.address}
                </Text>
                <Text style={styles.meta}>{item.clinic.address}</Text>
                <Text style={styles.meta}>
                  {item.schedule_count > 0
                    ? `${item.schedule_count} timing slot${item.schedule_count === 1 ? "" : "s"}`
                    : "No schedule set"}
                </Text>

                <Pressable onPress={() => router.push(`/clinic/${item.id}`)}>
                  <Text style={styles.scheduleLink}>Manage schedule →</Text>
                </Pressable>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.text} />
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => onDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={styles.actionDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editing ? "Edit clinic" : "Add clinic"}
              </Text>
              <View style={{ height: 12 }} />
              <Input
                label="Clinic name"
                value={form.name}
                onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                placeholder="e.g. City Care Clinic"
              />
              <View style={{ height: 10 }} />
              <Input
                label="Address"
                value={form.address}
                onChangeText={(address) => setForm((f) => ({ ...f, address }))}
                placeholder="Street / building"
              />
              <View style={{ height: 10 }} />
              <Input
                label="City"
                value={form.city}
                onChangeText={(city) => setForm((f) => ({ ...f, city }))}
                placeholder="Karachi"
              />
              <View style={{ height: 10 }} />
              <Input
                label="Area"
                value={form.area}
                onChangeText={(area) => setForm((f) => ({ ...f, area }))}
                placeholder="Gulshan / Clifton"
              />
              <View style={{ height: 10 }} />
              <Input
                label="Phone"
                value={form.phone}
                onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
              <ErrorText>{formError}</ErrorText>
              <View style={{ height: 16 }} />
              <Button
                label={editing ? "Update clinic" : "Save clinic"}
                loading={saving}
                onPress={onSave}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalOpen(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
