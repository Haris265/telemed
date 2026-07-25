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
import type { Doctor } from "@/lib/types";
import { colors } from "@/constants/theme";

export default function DoctorsScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDoctors(await api.doctors());
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

  return (
    <Screen>
      <Title>Doctors</Title>
      <Subtitle>Browse clinicians and check weekly availability.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => d.uuid}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Empty title="No doctors available" />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/book/${item.uuid}`)}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name}>Dr. {item.full_name}</Text>
                <Text style={styles.meta}>{item.session_time} min · Tap for dates</Text>
                <View style={styles.tags}>
                  {item.specialities.map((s) => (
                    <Badge key={s.id} label={s.name} tone="info" />
                  ))}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  name: { color: colors.text, fontWeight: "700", fontSize: 16 },
  meta: { color: colors.muted, fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
