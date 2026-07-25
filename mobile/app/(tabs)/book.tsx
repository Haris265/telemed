import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { FilterChips, ResultCount } from "@/components/FilterChips";
import { DoctorCard, SpecialityCard } from "@/components/ListCards";
import { SearchField } from "@/components/SearchField";
import { Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Doctor, Speciality } from "@/lib/types";
import { colors } from "@/constants/theme";

type SortFilter = "all" | "az" | "za";

export default function BookScreen() {
  const router = useRouter();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specQuery, setSpecQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [sort, setSort] = useState<SortFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");

  const loadSpecs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSpecialities(await api.specialities());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSpecs();
    }, [loadSpecs]),
  );

  const filteredSpecs = useMemo(() => {
    const q = specQuery.trim().toLowerCase();
    let list = specialities.filter((s) => !q || s.name.toLowerCase().includes(q));
    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [specialities, specQuery, sort]);

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.full_name.toLowerCase().includes(q) ||
        d.specialities.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [doctors, docQuery]);

  async function pickSpeciality(id: number) {
    if (selected === id) {
      setSelected(null);
      setDoctors([]);
      setDocQuery("");
      return;
    }
    setSelected(id);
    setDocQuery("");
    setLoadingDocs(true);
    setError("");
    try {
      setDoctors(await api.doctors(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load doctors");
    } finally {
      setLoadingDocs(false);
    }
  }

  const selectedName = specialities.find((s) => s.id === selected)?.name;

  return (
    <Screen>
      <Title>Book a token</Title>
      <Subtitle>Find a speciality, then choose your doctor.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filteredSpecs}
          keyExtractor={(item) => String(item.id)}
          style={{ marginTop: 14 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <SearchField
                value={specQuery}
                onChangeText={setSpecQuery}
                placeholder="Search specialities…"
              />
              <FilterChips
                selectedId={sort}
                onSelect={(id) => setSort(id as SortFilter)}
                options={[
                  { id: "all", label: "All" },
                  { id: "az", label: "A → Z" },
                  { id: "za", label: "Z → A" },
                ]}
              />
              <ResultCount
                label={`${filteredSpecs.length} specialit${filteredSpecs.length === 1 ? "y" : "ies"}`}
              />
              <Text style={styles.section}>Specialities</Text>
            </View>
          }
          ListEmptyComponent={
            <Empty title="No specialities found" body="Try another search." />
          }
          renderItem={({ item }) => (
            <SpecialityCard
              item={item}
              active={selected === item.id}
              onPress={() => pickSpeciality(item.id)}
            />
          )}
          ListFooterComponent={
            <View style={styles.docsBlock}>
              <Text style={styles.section}>
                {selectedName ? `Doctors · ${selectedName}` : "Doctors"}
              </Text>
              {!selected ? (
                <Empty title="Pick a speciality" body="Doctors for that field will show here." />
              ) : loadingDocs ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
              ) : (
                <>
                  <SearchField
                    value={docQuery}
                    onChangeText={setDocQuery}
                    placeholder="Search doctors…"
                  />
                  <ResultCount
                    label={`${filteredDocs.length} doctor${filteredDocs.length === 1 ? "" : "s"}`}
                  />
                  {!filteredDocs.length ? (
                    <Empty title="No doctors" body="Try another search or speciality." />
                  ) : (
                    filteredDocs.map((d) => (
                      <DoctorCard
                        key={d.uuid}
                        doctor={d}
                        onPress={() => router.push(`/book/${d.uuid}`)}
                      />
                    ))
                  )}
                </>
              )}
            </View>
          }
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
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },
  docsBlock: {
    marginTop: 18,
    gap: 12,
    paddingBottom: 8,
  },
});
