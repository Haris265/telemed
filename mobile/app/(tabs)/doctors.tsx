import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { FilterChips, ResultCount } from "@/components/FilterChips";
import { DoctorCard } from "@/components/ListCards";
import { SearchField } from "@/components/SearchField";
import { Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Doctor, Speciality } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function DoctorsScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docs, specs] = await Promise.all([api.doctors(), api.specialities()]);
      setDoctors(docs);
      setSpecialities(specs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filterOptions = useMemo(
    () => [
      { id: "all", label: "All" },
      ...specialities.map((s) => ({ id: String(s.id), label: s.name })),
    ],
    [specialities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchesFilter =
        filterId === "all" ||
        d.specialities.some((s) => String(s.id) === filterId);
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        d.full_name.toLowerCase().includes(q) ||
        d.specialities.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [doctors, filterId, query]);

  return (
    <Screen>
      <Title>Doctors</Title>
      <Subtitle>Search and filter clinicians, then pick a date.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.uuid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or speciality…"
              />
              <FilterChips
                options={filterOptions}
                selectedId={filterId}
                onSelect={setFilterId}
              />
              <ResultCount
                label={`${filtered.length} of ${doctors.length} doctor${doctors.length === 1 ? "" : "s"}`}
              />
            </View>
          }
          ListEmptyComponent={
            <Empty
              title="No doctors match"
              body="Try clearing search or choosing another filter."
            />
          }
          renderItem={({ item }) => (
            <DoctorCard
              doctor={item}
              actionLabel="View"
              onPress={() => router.push(`/book/${item.uuid}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    gap: 12,
    marginBottom: 8,
  },
});
