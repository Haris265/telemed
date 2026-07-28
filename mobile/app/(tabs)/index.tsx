import { useCallback, useMemo, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function HomeScreen() {
  const { patient, refreshMe } = useAuth();
  const { colors, fonts } = useTheme();
  const router = useRouter();
  const [waError, setWaError] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hello: {
          color: colors.primary,
          fontFamily: fonts.sansBold,
          marginBottom: 4,
        },
        cardTitle: {
          color: colors.text,
          fontSize: 17,
          fontFamily: fonts.sansBold,
        },
        cardBody: {
          color: colors.muted,
          fontSize: 14,
          lineHeight: 21,
          fontFamily: fonts.sans,
        },
        error: {
          color: colors.danger,
          fontSize: 13,
          fontFamily: fonts.sans,
        },
      }),
    [colors, fonts],
  );

  useFocusEffect(
    useCallback(() => {
      setWaError("");
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    setWaError("");
    try {
      await refreshMe();
    } catch {
      // stay signed in with cached profile
    } finally {
      setRefreshing(false);
    }
  }

  async function openWhatsApp() {
    setWaError("");
    setWaLoading(true);
    try {
      const clinic = await api.clinic();
      let url = (clinic.whatsapp_link || "").trim();
      if (!url && clinic.whatsapp_number) {
        const text = encodeURIComponent(clinic.book_prefill || "2");
        url = `https://wa.me/${clinic.whatsapp_number}?text=${text}`;
      }
      if (!url) {
        setWaError("Clinic WhatsApp bot is not configured yet.");
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (!can) {
        setWaError("Unable to open WhatsApp on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      setWaError(e instanceof Error ? e.message : "WhatsApp link failed");
    } finally {
      setWaLoading(false);
    }
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
        <Text style={styles.hello}>
          Hello{patient?.name ? `, ${patient.name.split(" ")[0]}` : ""}
        </Text>
        <Title>Clinic care, on your phone</Title>
        <Subtitle>
          Book a token in the app, check doctor hours, or continue on WhatsApp.
        </Subtitle>

        <View style={{ height: 20 }} />

        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Nearby clinics</Text>
          <Text style={styles.cardBody}>
            Share your location to see which clinics are closest to you.
          </Text>
          <Button
            label="Find nearby clinics"
            variant="secondary"
            onPress={() => router.push("/clinics/nearby")}
          />
        </Card>

        <View style={{ height: 12 }} />

        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Symptoms checker</Text>
          <Text style={styles.cardBody}>
            Not sure who to see? Describe your symptoms and get a speciality suggestion.
          </Text>
          <Button
            label="Check symptoms"
            variant="secondary"
            onPress={() => router.push("/symptoms")}
          />
        </Card>

        <View style={{ height: 12 }} />

        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Book appointment</Text>
          <Text style={styles.cardBody}>
            Choose speciality, doctor, and date — get your token instantly.
          </Text>
          <Button label="Book in app" onPress={() => router.push("/(tabs)/book")} />
        </Card>

        <View style={{ height: 12 }} />

        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Book on WhatsApp</Text>
          <Text style={styles.cardBody}>
            Opens the clinic WhatsApp bot to book with the same token queue.
          </Text>
          <Button
            label="Open WhatsApp bot"
            variant="secondary"
            onPress={openWhatsApp}
            loading={waLoading}
          />
          {waError ? <Text style={styles.error}>{waError}</Text> : null}
        </Card>

        <View style={{ height: 12 }} />

        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Track live queue</Text>
          <Text style={styles.cardBody}>
            Enter today’s token number to see who’s being served and your wait time.
          </Text>
          <Button
            label="Open live queue"
            variant="secondary"
            onPress={() => router.push("/(tabs)/queue")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
