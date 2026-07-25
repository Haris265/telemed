import { StyleSheet, Text, View } from "react-native";

import { Badge, Card } from "@/components/ui";
import { colors } from "@/constants/theme";
import type { QueueInfo, QueuePhase } from "@/lib/types";

function phaseTone(phase?: QueuePhase): "success" | "warning" | "info" | "neutral" {
  if (phase === "now") return "success";
  if (phase === "waiting") return "info";
  if (phase === "completed") return "neutral";
  if (phase === "cancelled") return "warning";
  return "info";
}

function phaseLabel(phase?: QueuePhase, status?: string) {
  if (phase === "now") return "Your turn";
  if (phase === "waiting") return "In queue";
  if (phase === "completed") return "Completed";
  if (phase === "cancelled") return "Cancelled";
  return status || "Queue";
}

function formatWait(mins?: number) {
  if (mins == null) return "—";
  if (mins <= 0) return "Now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function LiveQueueCard({ queue }: { queue: QueueInfo }) {
  const phase = queue.phase;
  const approx =
    queue.approx_time ||
    new Date(queue.estimated_at).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Badge label={phaseLabel(phase, queue.status)} tone={phaseTone(phase)} />
        {queue.is_today ? <Badge label="Today" tone="warning" /> : null}
      </View>

      <Text style={styles.token}>{queue.token_code}</Text>
      <Text style={styles.doctor}>Dr. {queue.doctor_name}</Text>
      <Text style={styles.date}>{queue.date_label || queue.token_date}</Text>

      <View style={styles.nowBox}>
        <Text style={styles.nowLabel}>Now serving</Text>
        <Text style={styles.nowValue}>{queue.now_serving_code || "—"}</Text>
      </View>

      <Card style={{ gap: 12, marginTop: 14 }}>
        <Stat label="Your token" value={`#${queue.token_number}`} />
        <Stat label="People ahead" value={String(queue.people_ahead)} />
        <Stat label="Est. wait" value={formatWait(queue.wait_minutes)} />
        <Stat label="Approx time" value={approx} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.message}>{queue.message}</Text>
        <Text style={styles.hint}>
          Stay home or nearby until your turn — updates refresh automatically.
        </Text>
      </Card>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  token: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  doctor: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  date: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  nowBox: {
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  nowLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  nowValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: 1,
  },
  message: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  hint: {
    color: colors.muted,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  stat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: { color: colors.muted, fontSize: 14 },
  statValue: { color: colors.text, fontWeight: "700", fontSize: 15 },
});
