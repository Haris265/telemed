import { useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button, Card, ErrorText, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function ProfileScreen() {
  const { patient, signOut, refreshMe } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh profile");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
        <Subtitle>Your Telemed patient account.</Subtitle>
        <ErrorText>{error}</ErrorText>

        <View style={{ height: 16 }} />

        <Card style={{ gap: 10 }}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{patient?.name || "—"}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{patient?.phone || "—"}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {patient?.is_verified ? "Verified" : "Unverified"}
          </Text>
        </Card>

        <View style={{ height: 20 }} />
        <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
