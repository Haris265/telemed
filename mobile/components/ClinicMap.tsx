import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";

import type { ClinicNearby } from "@/lib/types";
import { colors } from "@/constants/theme";

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1c2b44" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#93a4bd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3c57" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#152033" }] },
];

export type MapPin = {
  latitude: number;
  longitude: number;
};

type Props = {
  pin: MapPin | null;
  clinics: ClinicNearby[];
  selectedClinicId?: number | null;
  onPinChange: (pin: MapPin) => void;
  onClinicPress?: (clinic: ClinicNearby) => void;
  interactive?: boolean;
  overlay?: ReactNode;
};

export function regionForPin(pin: MapPin, delta = 0.08): Region {
  return {
    latitude: pin.latitude,
    longitude: pin.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function regionFittingPins(pins: MapPin[]): Region {
  if (!pins.length) {
    return regionForPin({ latitude: 24.8607, longitude: 67.0011 }, 0.12);
  }
  if (pins.length === 1) return regionForPin(pins[0], 0.08);

  let minLat = pins[0].latitude;
  let maxLat = pins[0].latitude;
  let minLng = pins[0].longitude;
  let maxLng = pins[0].longitude;
  for (const p of pins.slice(1)) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  const latDelta = Math.max((maxLat - minLat) * 1.4, 0.06);
  const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.06);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function ClinicMap({
  pin,
  clinics,
  selectedClinicId,
  onPinChange,
  onClinicPress,
  interactive = true,
  overlay,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo(() => {
    const pins: MapPin[] = [];
    if (pin) pins.push(pin);
    for (const c of clinics) {
      pins.push({ latitude: c.latitude, longitude: c.longitude });
    }
    return regionFittingPins(pins);
  }, [pin, clinics]);

  useEffect(() => {
    mapRef.current?.animateToRegion(initialRegion, 350);
  }, [initialRegion]);

  function handlePress(e: MapPressEvent) {
    if (!interactive) return;
    onPinChange(e.nativeEvent.coordinate);
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.outer} pointerEvents="box-none">
        <View style={styles.wrap}>
          <View style={styles.webFallback}>
            <Text style={styles.webTitle}>Map preview</Text>
            <Text style={styles.webBody}>
              {pin
                ? `Pin: ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`
                : "Tap Search or pick an area below."}
            </Text>
            {clinics.length ? (
              <Text style={styles.webBody}>{clinics.length} clinic(s) found</Text>
            ) : null}
          </View>
        </View>
        {overlay}
      </View>
    );
  }

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <View style={styles.wrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={handlePress}
          customMapStyle={Platform.OS === "android" ? DARK_MAP_STYLE : undefined}
          userInterfaceStyle="dark"
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {pin ? (
            <Marker
              coordinate={pin}
              title="Your search location"
              description="Drag or tap the map to move"
              pinColor={colors.primary}
              draggable={interactive}
              onDragEnd={(e) => onPinChange(e.nativeEvent.coordinate)}
            />
          ) : null}
          {clinics.map((clinic) => (
            <Marker
              key={clinic.id}
              coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
              title={clinic.name}
              description={
                clinic.distance_km > 0
                  ? `${clinic.distance_km.toFixed(1)} km away`
                  : clinic.address
              }
              pinColor={selectedClinicId === clinic.id ? colors.success : colors.danger}
              onPress={() => onClinicPress?.(clinic)}
            />
          ))}
        </MapView>
        {interactive ? (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>Tap map or drag pin to set location</Text>
          </View>
        ) : null}
      </View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "relative",
    zIndex: 1,
  },
  wrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  map: {
    width: "100%",
    height: 320,
  },
  hintBar: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  webFallback: {
    width: "100%",
    height: 320,
    padding: 16,
    justifyContent: "center",
    gap: 6,
  },
  webTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  webBody: {
    color: colors.muted,
    fontSize: 13,
  },
});
