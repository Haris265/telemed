import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { ResultCount } from "@/components/FilterChips";
import { DoctorCard } from "@/components/ListCards";
import { SearchField } from "@/components/SearchField";
import { Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Doctor } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function ClinicSpecialityDoctorsScreen() {
  const { id, specId, name, clinicName } = useLocalSearchParams<{
    id: string;
    specId: string;
    name?: string;
    clinicName?: string;
  }>();
  const clinicId = Number(id);
  const specialityId = Number(specId);
  const specialityName = name?.trim() || "Doctors";
  const clinicLabel = clinicName?.trim() || "Clinic";

  const router = useRouter();
  const navigation = useNavigation();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation.setOptions({ title: specialityName });
  }, [navigation, specialityName]);

  const load = useCallback(async () => {
    if (!Number.isFinite(clinicId) || !Number.isFinite(specialityId)) {
      setError("Invalid clinic or speciality");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const clinic = await api.clinicDetail(clinicId);
      const filtered = clinic.doctors.filter((d) =>
        d.specialities.some((s) => s.id === specialityId),
      );
      setDoctors(filtered);
    } catch (e) {
      setDoctors([]);
      setError(e instanceof Error ? e.message : "Failed to load doctors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, specialityId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => d.full_name.toLowerCase().includes(q));
  }, [doctors, query]);

  return (
    <Screen>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(d) => d.uuid}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
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
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Title>{specialityName}</Title>
            <Subtitle>
              Doctors for {specialityName} at {clinicLabel}. Tap a doctor to book.
            </Subtitle>
            <ErrorText>{error}</ErrorText>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.toolbar}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search doctor name…"
                />
                <ResultCount
                  label={`${filtered.length} doctor${filtered.length === 1 ? "" : "s"}`}
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Empty
              title="No doctors for this speciality"
              body="Try another speciality or go back to the clinic."
            />
          )
        }
        renderItem={({ item }) => (
          <DoctorCard
            doctor={item}
            actionLabel="Book"
            onPress={() =>
              router.push({
                pathname: "/book/[doctorUuid]",
                params: {
                  doctorUuid: item.uuid,
                  clinicId: String(clinicId),
                },
              })
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    gap: 12,
    marginBottom: 8,
  },
});
