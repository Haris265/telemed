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

import { AppointmentCard } from "@/components/AppointmentCard";
import { LoadingState } from "@/components/LoadingState";
import { Empty, Screen, StatCard, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardStats } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { doctor, refreshMe } = useAuth();
  const { colors, fonts } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  function openAppointments(filter: string) {
    router.push({ pathname: "/(tabs)/appointments", params: { filter } });
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hello: {
          color: colors.primary,
          fontFamily: fonts.sansBold,
          marginBottom: 4,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        fullStat: {
          flexDirection: "row",
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 18,
          fontFamily: fonts.sansBold,
        },
        error: {
          color: colors.danger,
          marginBottom: 12,
          fontFamily: fonts.sans,
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    const [data] = await Promise.all([api.dashboard(), refreshMe()]);
    setStats(data);
  }, [refreshMe]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={onRefresh}
          />
        }
      >
        <Text style={styles.hello}>
          Dr. {doctor?.last_name || doctor?.full_name || "Doctor"}
        </Text>
        <Title>Today&apos;s clinic</Title>
        <Subtitle>Pull down to refresh your queue and analytics.</Subtitle>

        <View style={{ height: 20 }} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing ? (
          <LoadingState label="Loading dashboard…" />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Today upcoming"
                value={stats?.today_upcoming ?? "—"}
                color={colors.primary}
                onPress={() => openAppointments("today")}
              />
              <StatCard
                label="Today completed"
                value={stats?.today_completed ?? "—"}
                color={colors.success}
                onPress={() => openAppointments("completed")}
              />
              <StatCard
                label="Today rejected"
                value={stats?.today_rejected ?? "—"}
                color={colors.danger}
                onPress={() => openAppointments("rejected")}
              />
              <StatCard
                label="Future bookings"
                value={stats?.future_bookings ?? "—"}
                color={colors.warning}
                onPress={() => openAppointments("future")}
              />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.fullStat}>
              <StatCard
                label="Total patients seen"
                value={stats?.total_patients_seen ?? "—"}
                color={colors.primary}
                onPress={() => router.push("/(tabs)/patients")}
              />
            </View>

            <View style={{ height: 24 }} />

            <Pressable
              onPress={() => openAppointments("today")}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={styles.sectionTitle}>Today&apos;s queue →</Text>
            </Pressable>
            <View style={{ height: 10 }} />

            {stats?.upcoming_today?.length ? (
              <View style={{ gap: 10 }}>
                {stats.upcoming_today.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} detailed />
                ))}
              </View>
            ) : (
              <Empty
                title="No upcoming patients today"
                body="Check Appointments for future bookings."
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
