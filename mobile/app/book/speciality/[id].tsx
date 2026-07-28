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

export default function SpecialityDoctorsScreen() {
  const { id, name, symptomCheckId } = useLocalSearchParams<{
    id: string;
    name?: string;
    symptomCheckId?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const specialityId = Number(id);
  const specialityName = name?.trim() || "Doctors";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation.setOptions({ title: specialityName });
  }, [navigation, specialityName]);

  const load = useCallback(async () => {
    if (!Number.isFinite(specialityId)) {
      setError("Invalid speciality");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      setDoctors(await api.doctors(specialityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load doctors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [specialityId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.full_name.toLowerCase().includes(q) ||
        d.specialities.some((s) => s.name.toLowerCase().includes(q)),
    );
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
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Title>{specialityName}</Title>
            <Subtitle>Choose a doctor to pick a date.</Subtitle>
            <ErrorText>{error}</ErrorText>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.toolbar}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search doctors…"
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
            <Empty title="No doctors" body="Try another search or go back and pick another speciality." />
          )
        }
        renderItem={({ item }) => (
          <DoctorCard
            doctor={item}
            onPress={() =>
              router.push({
                pathname: "/book/[doctorUuid]",
                params: {
                  doctorUuid: item.uuid,
                  ...(symptomCheckId ? { symptomCheckId } : {}),
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
