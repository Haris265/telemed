import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Monday-first index 0..6 */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

type Props = {
  availableDates: Set<string>;
  selected: string | null;
  onSelect: (date: string) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
};

export function MonthCalendar({
  availableDates,
  selected,
  onSelect,
  month,
  onMonthChange,
}: Props) {
  const first = startOfMonth(month);
  const lead = mondayIndex(first);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, -1))}
          hitSlop={12}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          hitSlop={12}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`e-${i}`} style={styles.cell} />;
          }
          const key = toKey(cell);
          const enabled = availableDates.has(key);
          const active = selected === key;
          return (
            <Pressable
              key={key}
              disabled={!enabled}
              onPress={() => onSelect(key)}
              style={[
                styles.cell,
                enabled && styles.cellAvailable,
                active && styles.cellActive,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  !enabled && styles.dayMuted,
                  active && styles.dayActive,
                ]}
              >
                {cell.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  navText: {
    fontSize: 22,
    color: colors.text,
    lineHeight: 26,
    fontFamily: fonts.sansBold,
  },
  monthTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.serifBold,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.sansSemi,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  cellAvailable: {
    backgroundColor: colors.bgSoft,
  },
  cellActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.sansSemi,
  },
  dayMuted: {
    color: colors.border,
  },
  dayActive: {
    color: "#fff",
    fontFamily: fonts.sansBold,
  },
});
