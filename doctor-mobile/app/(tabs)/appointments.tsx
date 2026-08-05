import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AppointmentCard } from "@/components/AppointmentCard";
import { FilterChips, ResultSummary, type FilterOption } from "@/components/FilterChips";
import { LoadingState } from "@/components/LoadingState";
import { SearchField } from "@/components/SearchField";
import { Empty, Screen, Subtitle, Title } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { formatDate, todayIso } from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

type Filter = "all" | "today" | "future" | "completed" | "rejected";

const FILTERS: Filter[] = ["all", "today", "future", "completed", "rejected"];

function parseFilter(value?: string | string[]): Filter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && FILTERS.includes(raw as Filter)) return raw as Filter;
  return null;
}

type FilterCounts = Record<Filter, number>;

const FILTER_HINTS: Record<Filter, string> = {
  all: "All upcoming from today",
  today: "Scheduled for today",
  future: "Upcoming after today",
  completed: "Finished visits",
  rejected: "Skipped or declined",
};

function matchesSearch(appt: Appointment, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    appt.patient_name.toLowerCase().includes(q) ||
    appt.patient_phone.includes(q) ||
    appt.token_code.toLowerCase().includes(q) ||
    String(appt.token_number).includes(q)
  );
}

function groupByDate(appointments: Appointment[]) {
  const groups = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = appt.token_date;
    const list = groups.get(key) || [];
    list.push(appt);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

async function fetchFilterData(filter: Filter, today: string) {
  if (filter === "today") {
    return api.appointments({ today: true, upcoming: false });
  }
  if (filter === "future") {
    const data = await api.appointments({ status: "upcoming", upcoming: false });
    return data.filter((a) => a.token_date > today);
  }
  if (filter === "completed") {
    return api.appointments({ status: "completed", upcoming: false });
  }
  if (filter === "rejected") {
    return api.appointments({ status: "rejected", upcoming: false });
  }
  const data = await api.appointments({ status: "upcoming", upcoming: false });
  return data.filter((a) => a.token_date >= today);
}

async function fetchCounts(today: string): Promise<FilterCounts> {
  const [todayList, upcoming, completed, rejected] = await Promise.all([
    api.appointments({ today: true, upcoming: false }),
    api.appointments({ status: "upcoming", upcoming: false }),
    api.appointments({ status: "completed", upcoming: false }),
    api.appointments({ status: "rejected", upcoming: false }),
  ]);
  const future = upcoming.filter((a) => a.token_date > today);
  const all = upcoming.filter((a) => a.token_date >= today);

  return {
    all: all.length,
    today: todayList.length,
    future: future.length,
    completed: completed.length,
    rejected: rejected.length,
  };
}

export default function AppointmentsScreen() {
  const { colors, fonts } = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>(
    () => parseFilter(params.filter) || "today",
  );
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [counts, setCounts] = useState<FilterCounts>({
    all: 0,
    today: 0,
    future: 0,
    completed: 0,
    rejected: 0,
  });

  useEffect(() => {
    const next = parseFilter(params.filter);
    if (next) setFilter(next);
  }, [params.filter]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: 32 },
        header: { paddingHorizontal: 16, paddingTop: 4 },
        tools: { paddingLeft: 16, gap: 14, marginTop: 16 },
        searchPad: { paddingRight: 16 },
        list: { paddingHorizontal: 16, gap: 10, marginTop: 4 },
        summaryPad: { paddingRight: 16 },
        group: { marginBottom: 18, gap: 8 },
        groupTitle: {
          color: colors.text,
          fontSize: 15,
          fontFamily: fonts.sansExtra,
        },
        groupMeta: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
          marginBottom: 4,
        },
        groupList: { gap: 10 },
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
    const today = todayIso();
    const [data, nextCounts] = await Promise.all([
      fetchFilterData(filter, today),
      fetchCounts(today),
    ]);
    setAppointments(data);
    setCounts(nextCounts);
  }, [filter]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  const filtered = useMemo(
    () => appointments.filter((a) => matchesSearch(a, search)),
    [appointments, search],
  );

  const grouped = useMemo(() => {
    if (filter === "today") return null;
    return groupByDate(filtered);
  }, [filter, filtered]);

  const filterOptions: FilterOption[] = [
    { id: "today", label: "Today", icon: "today-outline", count: counts.today },
    { id: "future", label: "Future", icon: "calendar-outline", count: counts.future },
    { id: "all", label: "Upcoming", icon: "layers-outline", count: counts.all },
    { id: "completed", label: "Done", icon: "checkmark-circle-outline", count: counts.completed },
    { id: "rejected", label: "Rejected", icon: "close-circle-outline", count: counts.rejected },
  ];

  const resultLabel =
    filtered.length === 1
      ? "1 appointment"
      : `${filtered.length} appointments`;

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
          <Title>Appointments</Title>
          <Subtitle>Filter, search, and manage your clinic schedule.</Subtitle>
        </View>

        <View style={styles.tools}>
          <View style={styles.searchPad}>
            <SearchField value={search} onChangeText={setSearch} />
          </View>
          <FilterChips
            options={filterOptions}
            selectedId={filter}
            onSelect={(id) => setFilter(id as Filter)}
          />
          <View style={styles.summaryPad}>
            <ResultSummary
              label={resultLabel}
              hint={FILTER_HINTS[filter]}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !refreshing ? (
          <LoadingState label="Loading appointments…" />
        ) : filtered.length ? (
          <View style={styles.list}>
            {grouped ? (
              grouped.map(([date, items]) => (
                <View key={date} style={styles.group}>
                  <Text style={styles.groupTitle}>{formatDate(date)}</Text>
                  <Text style={styles.groupMeta}>
                    {items.length} appointment{items.length === 1 ? "" : "s"}
                  </Text>
                  <View style={styles.groupList}>
                    {items.map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appointment={appt}
                        detailed
                      />
                    ))}
                  </View>
                </View>
              ))
            ) : (
              filtered.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} detailed />
              ))
            )}
          </View>
        ) : (
          <Empty
            title={search ? "No matches" : "No appointments"}
            body={
              search
                ? "Try a different name, phone, or token."
                : "Nothing found for this filter. Pull down to refresh."
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}
