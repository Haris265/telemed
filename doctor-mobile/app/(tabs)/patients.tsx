import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { LoadingState } from "@/components/LoadingState";
import { SearchField } from "@/components/SearchField";
import { Badge, Empty, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorPatientSummary } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

function matchesPatient(patient: DoctorPatientSummary, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    patient.name.toLowerCase().includes(q) ||
    patient.phone.includes(q) ||
    patient.next_appointment?.token_code.toLowerCase().includes(q)
  );
}

export default function PatientsScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [search, setSearch] = useState("");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: 32 },
        header: { paddingHorizontal: 16, paddingTop: 4 },
        tools: { paddingHorizontal: 16, gap: 12, marginTop: 16 },
        count: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansBold,
        },
        list: { paddingHorizontal: 16, gap: 10, marginTop: 8 },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          gap: 4,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        name: {
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansBold,
        },
        meta: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
        },
        upcoming: {
          color: colors.warning,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
        },
        next: {
          color: colors.primary,
          fontSize: 13,
          fontFamily: fonts.sansSemi,
          marginTop: 4,
        },
        error: {
          color: colors.danger,
          paddingHorizontal: 16,
          marginTop: 8,
          fontFamily: fonts.sans,
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    const data = await api.patients();
    setPatients(data);
  }, []);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  const filtered = useMemo(
    () => patients.filter((p) => matchesPatient(p, search)),
    [patients, search],
  );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.header}>
          <Title>Patients</Title>
          <Subtitle>Patients with today or upcoming bookings.</Subtitle>
        </View>

        <View style={styles.tools}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient or phone…"
          />
          <Text style={styles.count}>
            {filtered.length} patient{filtered.length === 1 ? "" : "s"}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing ? (
          <LoadingState label="Loading patients…" />
        ) : filtered.length ? (
          <View style={styles.list}>
            {filtered.map((patient) => (
              <Pressable
                key={patient.uuid}
                onPress={() => router.push(`/patient/${patient.uuid}`)}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.row}>
                  <Text style={styles.name}>{patient.name}</Text>
                  <Badge label={`${patient.total_visits} visits`} tone="info" />
                </View>
                <Text style={styles.meta}>{patient.phone}</Text>
                {patient.upcoming_count > 0 ? (
                  <Text style={styles.upcoming}>
                    {patient.upcoming_count} upcoming booking
                    {patient.upcoming_count === 1 ? "" : "s"}
                  </Text>
                ) : null}
                {patient.next_appointment ? (
                  <Text style={styles.next}>
                    Next: {patient.next_appointment.token_code} ·{" "}
                    {formatDate(patient.next_appointment.token_date)} ·{" "}
                    {formatTime(patient.next_appointment.scheduled_at)}
                  </Text>
                ) : (
                  <Text style={styles.meta}>No upcoming booking</Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <Empty
            title={search ? "No matches" : "No patients"}
            body={
              search
                ? "Try a different name or phone."
                : "Patients with upcoming bookings will appear here."
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}
