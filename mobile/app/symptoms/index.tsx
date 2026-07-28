import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { Badge, Button, Card, ErrorText, Input, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { SymptomCheckResult, SymptomUrgency } from "@/lib/types";
import { colors } from "@/constants/theme";

const SYMPTOM_CHIPS = [
  "Fever",
  "Headache",
  "Cough",
  "Chest pain",
  "Stomach pain",
  "Skin rash",
  "Back pain",
  "Sore throat",
  "Nausea",
  "Dizziness",
];

function urgencyLabel(urgency: SymptomUrgency) {
  if (urgency === "emergency") return "Emergency";
  if (urgency === "urgent") return "Urgent";
  return "Routine";
}

function urgencyTone(urgency: SymptomUrgency): "info" | "warning" | "success" {
  if (urgency === "emergency") return "warning";
  if (urgency === "urgent") return "info";
  return "success";
}

export default function SymptomsScreen() {
  const router = useRouter();
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [extraText, setExtraText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SymptomCheckResult | null>(null);

  const symptoms = useMemo(() => {
    const parts = [...selectedChips];
    const extra = extraText.trim();
    if (extra) parts.push(extra);
    return parts.join(", ");
  }, [selectedChips, extraText]);

  const canSubmit = symptoms.trim().length >= 10;

  const chipOptions = useMemo(
    () => SYMPTOM_CHIPS.map((label) => ({ id: label, label })),
    [],
  );

  function toggleChip(label: string) {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  }

  function resetForm() {
    if (result) {
      const parts = result.symptoms
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const chips: string[] = [];
      const extraParts: string[] = [];
      for (const part of parts) {
        const match = SYMPTOM_CHIPS.find(
          (chip) => chip.toLowerCase() === part.toLowerCase(),
        );
        if (match) chips.push(match);
        else extraParts.push(part);
      }
      setSelectedChips(chips);
      setExtraText(extraParts.join(", "));
    } else {
      setSelectedChips([]);
      setExtraText("");
    }
    setResult(null);
    setError("");
  }

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.symptomsCheck(symptoms.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check symptoms");
    } finally {
      setLoading(false);
    }
  }

  function bookSpeciality(id: number, name: string) {
    router.push({
      pathname: "/book/speciality/[id]",
      params: {
        id: String(id),
        name,
        symptomCheckId: result ? String(result.id) : undefined,
      },
    });
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Title>Symptoms checker</Title>
        <Subtitle>
          Describe what you are feeling. We will suggest a speciality to book with.
        </Subtitle>

        <ErrorText>{error}</ErrorText>

        {!result ? (
          <View style={{ gap: 12, marginTop: 16 }}>
            <Input
              label="Your symptoms"
              value={extraText}
              onChangeText={setExtraText}
              placeholder={
                selectedChips.length
                  ? "Add more details (optional)…"
                  : "e.g. fever and sore throat for 2 days…"
              }
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={styles.textArea}
            />

            {selectedChips.length ? (
              <Text style={styles.selectedPreview}>Selected: {symptoms}</Text>
            ) : null}

            <Text style={styles.section}>Quick add</Text>
            <Text style={styles.chipHint}>Tap to add, tap again to remove.</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {chipOptions.map((chip) => {
                const active = selectedChips.includes(chip.label);
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => toggleChip(chip.label)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.hint}>
              {canSubmit
                ? "Ready to check."
                : "Enter at least 10 characters to continue."}
            </Text>

            <Button
              label="Check symptoms"
              onPress={submit}
              loading={loading}
              disabled={!canSubmit}
            />
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 16 }}>
            <Card style={{ gap: 10 }}>
              <Badge
                label={urgencyLabel(result.urgency)}
                tone={urgencyTone(result.urgency)}
              />
              <Text style={styles.summary}>{result.summary}</Text>
              {result.urgency === "emergency" ? (
                <Text style={styles.emergency}>
                  Visit the nearest emergency room or call emergency services if symptoms
                  are severe.
                </Text>
              ) : null}
            </Card>

            <Card style={{ gap: 8 }}>
              <Text style={styles.disclaimerTitle}>Important</Text>
              <Text style={styles.disclaimer}>{result.disclaimer}</Text>
            </Card>

            <Text style={styles.section}>Recommended specialities</Text>
            {result.recommended_specialities.length ? (
              result.recommended_specialities.map((spec) => (
                <Card key={spec.id} style={{ gap: 10 }}>
                  <Text style={styles.specName}>{spec.name}</Text>
                  <Button
                    label={`Book with ${spec.name}`}
                    onPress={() => bookSpeciality(spec.id, spec.name)}
                  />
                </Card>
              ))
            ) : (
              <Card>
                <Text style={styles.muted}>
                  No speciality matched. Try describing more symptoms or browse all
                  doctors.
                </Text>
              </Card>
            )}

            <Button label="Edit symptoms" variant="secondary" onPress={resetForm} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chipHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  selectedPreview: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  chipLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: colors.primary,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
  summary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  emergency: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  disclaimerTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  specName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
