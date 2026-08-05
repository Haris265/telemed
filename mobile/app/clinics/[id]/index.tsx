import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from "expo-router";

import { ClinicMap } from "@/components/ClinicMap";
import { Badge, Button, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { DoctorCard } from "@/components/ListCards";
import { api } from "@/lib/api";
import { openDirections } from "@/lib/mapUtils";
import type { ClinicDetail, ClinicNearby } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clinicId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(clinicId)) {
      setError("Invalid clinic");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const data = await api.clinicDetail(clinicId);
      setClinic(data);
      navigation.setOptions({ title: data.name });
    } catch (e) {
      setClinic(null);
      setError(e instanceof Error ? e.message : "Failed to load clinic");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  useEffect(() => {
    if (clinic?.name) navigation.setOptions({ title: clinic.name });
  }, [clinic?.name, navigation]);

  const mapClinic = useMemo<ClinicNearby | null>(() => {
    if (!clinic) return null;
    return {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      city: clinic.city,
      phone: clinic.phone,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      distance_km: 0,
      doctor_count: clinic.doctors.length,
    };
  }, [clinic]);

  async function callClinic(phone: string) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (!digits) return;
    const url = `tel:${digits}`;
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  }

  async function handleDirections() {
    if (!clinic) return;
    try {
      await openDirections({
        latitude: clinic.latitude,
        longitude: clinic.longitude,
        label: clinic.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open directions");
    }
  }

  function openSpeciality(specId: number, specName: string) {
    router.push({
      pathname: "/clinics/[id]/speciality/[specId]",
      params: {
        id: String(clinicId),
        specId: String(specId),
        name: specName,
        clinicName: clinic?.name ?? "Clinic",
      },
    });
  }

  if (loading && !clinic) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!clinic) {
    return (
      <Screen>
        <Empty title="Clinic not found" body={error || "Try going back."} />
        <ErrorText>{error}</ErrorText>
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
        <Title>{clinic.name}</Title>
        <Subtitle>
          {clinic.address}
          {clinic.city ? `, ${clinic.city}` : ""}
        </Subtitle>
        {clinic.phone ? (
          <Text style={styles.phone} onPress={() => callClinic(clinic.phone)}>
            {clinic.phone}
          </Text>
        ) : null}
        <ErrorText>{error}</ErrorText>

        {mapClinic ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <ClinicMap
              pin={null}
              clinics={[mapClinic]}
              selectedClinicId={clinic.id}
              onPinChange={() => {}}
              interactive={false}
            />
            <Button label="Get directions" onPress={handleDirections} />
          </View>
        ) : null}

        <Text style={styles.section}>Specialities — tap to see doctors</Text>
        {!clinic.specialities.length ? (
          <Empty title="No specialities listed" body="Doctors may not be assigned yet." />
        ) : (
          <View style={styles.chipWrap}>
            {clinic.specialities.map((spec) => (
              <Pressable
                key={spec.id}
                onPress={() => openSpeciality(spec.id, spec.name)}
                style={({ pressed }) => [styles.specChip, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.specLeft}>
                  <Text style={styles.specName}>{spec.name}</Text>
                  <Text style={styles.specHint}>
                    {spec.doctor_count} doctor{spec.doctor_count === 1 ? "" : "s"} available
                  </Text>
                </View>
                <View style={styles.specRight}>
                  <Badge
                    label={`${spec.doctor_count}`}
                    tone="info"
                  />
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.section}>All doctors at this clinic</Text>
        {!clinic.doctors.length ? (
          <Empty
            title="No doctors assigned"
            body="You can still book from the Book tab."
          />
        ) : (
          clinic.doctors.map((doctor) => (
            <DoctorCard
              key={doctor.uuid}
              doctor={doctor}
              onPress={() =>
                router.push({
                  pathname: "/book/[doctorUuid]",
                  params: { doctorUuid: doctor.uuid, clinicId: String(clinicId) },
                })
              }
            />
          ))
        )}

        <View style={{ height: 12 }} />
        <Button
          label="Find more clinics on map"
          variant="secondary"
          onPress={() => router.push("/clinics/nearby")}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  phone: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  chipWrap: {
    gap: 8,
  },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  specLeft: {
    flex: 1,
    gap: 2,
  },
  specRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  specName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  specHint: {
    color: colors.muted,
    fontSize: 12,
  },
});
