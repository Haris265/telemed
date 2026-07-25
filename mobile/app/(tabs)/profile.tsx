import { StyleSheet, Text, View } from "react-native";

import { Button, Card, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function ProfileScreen() {
  const { patient, signOut } = useAuth();

  return (
    <Screen>
      <Title>Profile</Title>
      <Subtitle>Your Telemed patient account.</Subtitle>

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
      <Button label="Sign out" variant="danger" onPress={() => signOut()} />
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
