import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

import { ClinicMap, type MapPin } from "@/components/ClinicMap";
import { MapSearchBar } from "@/components/MapSearchBar";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorText,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  extractAreaFromSearch,
  openDirections,
  reverseGeocodeLabel,
  searchPlaces,
  type GeocodeResult,
} from "@/lib/mapUtils";
import type { ClinicNearby } from "@/lib/types";
import { colors } from "@/constants/theme";

type LocationMode = "gps" | "search";

const MAP_CENTER: MapPin = { latitude: 24.8607, longitude: 67.0011 };

type SearchOptions = {
  scrollToResults?: boolean;
  area?: string;
};

export default function NearbyClinicsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const clinicsSectionY = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeRequestId = useRef(0);

  const [mode, setMode] = useState<LocationMode>("search");
  const [pin, setPin] = useState<MapPin | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [searchArea, setSearchArea] = useState("");
  const [clinics, setClinics] = useState<ClinicNearby[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [matchMode, setMatchMode] = useState<"area" | "nearby">("nearby");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searchNoResults, setSearchNoResults] = useState(false);

  const searchAt = useCallback(
    async (coords: MapPin, label: string, options: SearchOptions = {}) => {
      const { scrollToResults = false, area } = options;
      setError("");
      setPermissionDenied(false);
      setLocationLabel(label);
      setPin(coords);
      setSelectedClinicId(null);
      setLoading(true);

      try {
        const data = await api.nearbyClinics(coords.latitude, coords.longitude, {
          radiusKm: area ? 8 : 5,
          area,
        });
        setClinics(data.results);
        setRadiusKm(data.radius_km);
        setMatchMode(data.match_mode);
        setSearchArea(data.area || area || "");
        setSearched(true);

        if (scrollToResults) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              y: Math.max(clinicsSectionY.current - 12, 0),
              animated: true,
            });
          }, 150);
        }
      } catch (e) {
        setClinics([]);
        setSearched(true);
        setError(e instanceof Error ? e.message : "Could not load clinics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const schedulePinSearch = useCallback(
    (coords: MapPin, label: string, delayMs = 400) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      setLoading(true);
      searchTimer.current = setTimeout(() => {
        setSearchArea("");
        setMode("search");
        void searchAt(coords, label);
      }, delayMs);
    },
    [searchAt],
  );

  const runGpsSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    setMode("gps");
    setSearchArea("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setClinics([]);
        setSearched(true);
        setError("Location permission denied. Search an area on the map instead.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      await searchAt(coords, "Your location", { scrollToResults: true });
    } catch (e) {
      setClinics([]);
      setSearched(true);
      setError(e instanceof Error ? e.message : "Could not get GPS location");
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchAt]);

  function handlePinChange(coords: MapPin) {
    setSearchQuery("");
    setSuggestions([]);
    setSearchNoResults(false);
    reverseGeocodeLabel(coords).then((label) => {
      schedulePinSearch(coords, label);
    });
  }

  async function fetchPlaceSuggestions(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchNoResults(false);
      setSearchLoading(false);
      return;
    }

    const requestId = ++geocodeRequestId.current;
    setSearchLoading(true);
    setSearchNoResults(false);

    try {
      const results = await searchPlaces(q);
      if (requestId !== geocodeRequestId.current) return;
      setSuggestions(results);
      setSearchNoResults(results.length === 0);
    } catch {
      if (requestId !== geocodeRequestId.current) return;
      setSuggestions([]);
      setSearchNoResults(true);
    } finally {
      if (requestId === geocodeRequestId.current) {
        setSearchLoading(false);
      }
    }
  }

  function schedulePlaceSuggestions(query: string, delayMs = 300) {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchNoResults(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    geocodeTimer.current = setTimeout(() => {
      fetchPlaceSuggestions(q);
    }, delayMs);
  }

  function handleSearchQueryChange(text: string) {
    setSearchQuery(text);
    setError("");
    if (!text.trim()) {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeRequestId.current += 1;
      setSuggestions([]);
      setSearchNoResults(false);
      setSearchLoading(false);
      return;
    }
    schedulePlaceSuggestions(text);
  }

  async function runPlaceSearch(query?: string) {
    const q = (query ?? searchQuery).trim();
    if (!q) return;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    await fetchPlaceSuggestions(q);
  }

  function applySearchResult(item: GeocodeResult) {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    geocodeRequestId.current += 1;
    Keyboard.dismiss();

    const area = extractAreaFromSearch(searchQuery, item.label, item.title);
    setSearchQuery(item.label);
    setSuggestions([]);
    setSearchNoResults(false);
    setSearchLoading(false);
    setMode("search");

    const coords = { latitude: item.latitude, longitude: item.longitude };
    void searchAt(coords, item.label, {
      scrollToResults: true,
      area,
    });
  }

  async function handleDirections(targetClinic?: ClinicNearby) {
    const clinic =
      targetClinic ||
      clinics.find((c) => c.id === selectedClinicId) ||
      clinics[0];

    if (!clinic) {
      Alert.alert(
        "Select a clinic",
        "Search a location first, then tap a clinic or use Directions.",
      );
      return;
    }

    try {
      await openDirections(
        {
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          label: clinic.name,
        },
        pin,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open directions");
    }
  }

  const mapOverlay = (
    <MapSearchBar
      value={searchQuery}
      onChangeText={handleSearchQueryChange}
      onSubmit={() => runPlaceSearch()}
      onClear={() => {
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        geocodeRequestId.current += 1;
        setSuggestions([]);
        setSearchNoResults(false);
        setSearchLoading(false);
      }}
      onDirections={() => handleDirections()}
      loading={searchLoading}
      suggestions={suggestions}
      onSelectSuggestion={applySearchResult}
      showNoResults={searchNoResults}
      placeholder="Search location on map"
    />
  );

  async function callClinic(phone: string) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (!digits) return;
    const url = `tel:${digits}`;
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  }

  const resultHint =
    matchMode === "area" && searchArea
      ? `Clinics in ${searchArea}`
      : `Clinics within ${radiusKm} km`;

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={() => {
              if (!pin) return;
              setRefreshing(true);
              void searchAt(pin, locationLabel, {
                area: searchArea || undefined,
              });
            }}
          />
        }
      >
        <Title>Find clinics</Title>
        <Subtitle>
          Search any area like Google Maps — e.g. Gulshan, Clifton. Only clinics in
          that area will show. Use GPS for clinics near you.
        </Subtitle>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode("search")}
            style={[styles.modeChip, mode === "search" && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, mode === "search" && styles.modeTextActive]}>
              Search map
            </Text>
          </Pressable>
          <Pressable
            onPress={runGpsSearch}
            style={[styles.modeChip, mode === "gps" && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, mode === "gps" && styles.modeTextActive]}>
              Near me (GPS)
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 14 }}>
          <ClinicMap
            pin={pin}
            clinics={clinics}
            selectedClinicId={selectedClinicId}
            onPinChange={handlePinChange}
            onClinicPress={(clinic) => {
              setSelectedClinicId(clinic.id);
              router.push(`/clinics/${clinic.id}`);
            }}
            interactive={mode === "search"}
            overlay={mapOverlay}
          />
        </View>

        <ErrorText>{error}</ErrorText>

        <View
          onLayout={(e) => {
            clinicsSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          {searched && !error ? (
            <Text style={styles.locationHint}>
              {resultHint} · {locationLabel}
              {clinics.length ? ` · ${clinics.length} clinic${clinics.length === 1 ? "" : "s"}` : ""}
            </Text>
          ) : !searched ? (
            <Text style={styles.locationHint}>
              Search a location above to see clinics in that area.
            </Text>
          ) : null}

          {loading && !refreshing ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} />
          ) : permissionDenied && mode === "gps" ? (
            <View style={{ gap: 12, marginTop: 16 }}>
              <Empty
                title="Location needed"
                body="Allow GPS or search an area on the map."
              />
            </View>
          ) : searched && !clinics.length ? (
            <View style={{ gap: 12, marginTop: 16 }}>
              <Empty
                title="No clinics in this area"
                body={
                  matchMode === "area" && searchArea
                    ? `No clinics registered in ${searchArea} yet. Try another area or use Near me.`
                    : "No clinics within range. Try searching Gulshan, Clifton, or DHA."
                }
              />
              <Button
                label="Book anyway"
                variant="secondary"
                onPress={() => router.push("/(tabs)/book")}
              />
            </View>
          ) : clinics.length ? (
            <View style={{ gap: 12, marginTop: 16 }}>
              {clinics.map((clinic) => {
                const active = selectedClinicId === clinic.id;
                return (
                  <Card
                    key={clinic.id}
                    style={[
                      { gap: 10 },
                      active && {
                        borderColor: colors.primary,
                        backgroundColor: "rgba(59,130,246,0.08)",
                      },
                    ]}
                  >
                    <View style={styles.row}>
                      <Text style={styles.name}>{clinic.name}</Text>
                      <Badge label={`${clinic.distance_km.toFixed(1)} km`} tone="info" />
                    </View>
                    {clinic.area ? (
                      <Text style={styles.area}>{clinic.area}</Text>
                    ) : null}
                    <Text style={styles.address}>
                      {clinic.address}
                      {clinic.city ? `, ${clinic.city}` : ""}
                    </Text>
                    <Text style={styles.meta}>
                      {clinic.doctor_count ?? 0} doctor
                      {(clinic.doctor_count ?? 0) === 1 ? "" : "s"} at this clinic
                    </Text>
                    {clinic.phone ? (
                      <Text style={styles.phone} onPress={() => callClinic(clinic.phone)}>
                        {clinic.phone}
                      </Text>
                    ) : null}
                    <Button
                      label="View doctors & specialities"
                      onPress={() => router.push(`/clinics/${clinic.id}`)}
                    />
                    <Button
                      label="Get directions"
                      variant="secondary"
                      onPress={() => handleDirections(clinic)}
                    />
                  </Card>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  modeText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  modeTextActive: {
    color: colors.primary,
  },
  locationHint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  area: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  address: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  phone: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
