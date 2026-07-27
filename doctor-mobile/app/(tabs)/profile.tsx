import { useCallback } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LoadingState } from "@/components/LoadingState";
import { Button, Card, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useScreenData } from "@/lib/useScreenData";
import { colors } from "@/constants/theme";

export default function ProfileScreen() {
  const { doctor, user, signOut, refreshMe } = useAuth();

  const load = useCallback(async () => {
    await refreshMe();
  }, [refreshMe]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  function onSignOut() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of your doctor account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: signOut },
      ],
    );
  }

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
        <Title>Profile</Title>
        <Subtitle>Pull down to refresh your account details.</Subtitle>

        <View style={{ height: 20 }} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing && !doctor ? (
          <LoadingState label="Loading profile…" />
        ) : (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{doctor?.full_name || "—"}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{doctor?.email || user?.email || "—"}</Text>

            <Text style={styles.label}>Specialities</Text>
            <Text style={styles.value}>
              {doctor?.specialities?.map((s) => s.name).join(", ") || "—"}
            </Text>

            <Text style={styles.label}>Session time</Text>
            <Text style={styles.value}>
              {doctor?.session_time ?? "—"} minutes
            </Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {doctor?.is_active ? "Active" : "Inactive"}
            </Text>
          </Card>
        )}

        <View style={{ height: 20 }} />

        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
});
