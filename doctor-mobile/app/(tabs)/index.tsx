import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppointmentCard } from "@/components/AppointmentCard";
import { LoadingState } from "@/components/LoadingState";
import { Empty, Screen, StatCard, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardStats } from "@/lib/types";
import { useScreenData } from "@/lib/useScreenData";
import { colors } from "@/constants/theme";

export default function DashboardScreen() {
  const { doctor, refreshMe } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

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
              />
              <StatCard
                label="Today completed"
                value={stats?.today_completed ?? "—"}
                color={colors.success}
              />
              <StatCard
                label="Today rejected"
                value={stats?.today_rejected ?? "—"}
                color={colors.danger}
              />
              <StatCard
                label="Future bookings"
                value={stats?.future_bookings ?? "—"}
                color={colors.warning}
              />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.fullStat}>
              <StatCard
                label="Total patients seen"
                value={stats?.total_patients_seen ?? "—"}
                color={colors.primary}
              />
            </View>

            <View style={{ height: 24 }} />

            <Text style={styles.sectionTitle}>Today&apos;s queue</Text>
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

const styles = StyleSheet.create({
  hello: {
    color: colors.primary,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
});
