import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Badge, Empty, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Doctor, Speciality } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function BookScreen() {
  const router = useRouter();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");

  const loadSpecs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.specialities();
      setSpecialities(data);
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

  async function pickSpeciality(id: number) {
    setSelected(id);
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

  return (
    <Screen>
      <Title>Book a token</Title>
      <Subtitle>Select a speciality, then a doctor.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={specialities}
          keyExtractor={(item) => String(item.id)}
          style={{ marginTop: 16 }}
          ListHeaderComponent={
            <Text style={styles.section}>Specialities</Text>
          }
          renderItem={({ item }) => {
            const active = selected === item.id;
            return (
              <Pressable
                onPress={() => pickSpeciality(item.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={{ marginTop: 20, paddingBottom: 40 }}>
              <Text style={styles.section}>Doctors</Text>
              {loadingDocs ? (
                <ActivityIndicator color={colors.primary} />
              ) : !selected ? (
                <Empty title="Pick a speciality" body="Doctors will appear here." />
              ) : !doctors.length ? (
                <Empty title="No doctors" body="Try another speciality." />
              ) : (
                doctors.map((d) => (
                  <Pressable
                    key={d.uuid}
                    style={styles.docRow}
                    onPress={() => router.push(`/book/${d.uuid}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>Dr. {d.full_name}</Text>
                      <Text style={styles.docMeta}>{d.session_time} min session</Text>
                    </View>
                    <Badge label="Select" tone="info" />
                  </Pressable>
                ))
              )}
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: colors.primary },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  docName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  docMeta: { color: colors.muted, marginTop: 2, fontSize: 13 },
});
