import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { FilterChips, ResultCount } from "@/components/FilterChips";
import { SpecialityCard } from "@/components/ListCards";
import { SearchField } from "@/components/SearchField";
import { Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Speciality } from "@/lib/types";
import { colors } from "@/constants/theme";

type SortFilter = "all" | "az" | "za";

export default function BookScreen() {
  const router = useRouter();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [specQuery, setSpecQuery] = useState("");
  const [sort, setSort] = useState<SortFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSpecs = useCallback(async () => {
    setError("");
    try {
      setSpecialities(await api.specialities());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSpecs();
    }, [loadSpecs]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSpecs();
  }, [loadSpecs]);

  const filteredSpecs = useMemo(() => {
    const q = specQuery.trim().toLowerCase();
    let list = specialities.filter((s) => !q || s.name.toLowerCase().includes(q));
    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [specialities, specQuery, sort]);

  function openSpeciality(item: Speciality) {
    router.push({
      pathname: "/book/speciality/[id]",
      params: { id: String(item.id), name: item.name },
    });
  }

  return (
    <Screen>
      <FlatList
        data={loading ? [] : filteredSpecs}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
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
            <Title>Book a token</Title>
            <Subtitle>Find a speciality, then choose your doctor.</Subtitle>
            <ErrorText>{error}</ErrorText>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
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
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Empty title="No specialities found" body="Try another search." />
          )
        }
        renderItem={({ item }) => (
          <SpecialityCard item={item} onPress={() => openSpeciality(item)} />
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
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },
});
