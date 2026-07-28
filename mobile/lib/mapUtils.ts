import { Linking, Platform } from "react-native";
import * as Location from "expo-location";

import type { MapPin } from "@/components/ClinicMap";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label: string;
};

function isInKarachi(latitude: number, longitude: number): boolean {
  return (
    latitude >= 24.75 &&
    latitude <= 25.15 &&
    longitude >= 66.85 &&
    longitude <= 67.35
  );
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=6` +
    `&countrycodes=pk&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TeleMedMobile/1.0",
    },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  return rows.map((row) => ({
    latitude: parseFloat(row.lat),
    longitude: parseFloat(row.lon),
    label: row.display_name,
  }));
}

export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const attempts = [q, `${q}, Karachi, Pakistan`, `${q}, Pakistan`];

  const seen = new Set<string>();
  const results: GeocodeResult[] = [];

  for (const attempt of attempts) {
    try {
      const rows = await Location.geocodeAsync(attempt);
      for (const row of rows) {
        const key = `${row.latitude.toFixed(5)},${row.longitude.toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const parts = [
          row.name,
          row.street,
          row.district,
          row.city,
          row.region,
        ].filter(Boolean);
        results.push({
          latitude: row.latitude,
          longitude: row.longitude,
          label: parts.length ? parts.join(", ") : attempt,
        });
      }
      if (results.length) break;
    } catch {
      // try next query variant
    }
  }

  return results.slice(0, 6);
}

/** Google Maps style place search using device geocoder + OpenStreetMap. */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const merged: GeocodeResult[] = [];

  let remote: GeocodeResult[] = [];
  try {
    remote = await geocodePlace(q);
  } catch {
    // device geocoder unavailable
  }

  if (!remote.length) {
    try {
      remote = await geocodeWithNominatim(`${q}, Karachi, Pakistan`);
    } catch {
      // network geocoder unavailable
    }
  }

  if (!remote.length) {
    try {
      remote = await geocodeWithNominatim(q);
    } catch {
      // broader search failed
    }
  }

  for (const row of remote) {
    const key = `${row.latitude.toFixed(4)},${row.longitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged.slice(0, 6);
}

/** Extract area token from search text for clinic area filtering. */
export function extractAreaFromSearch(query: string, label?: string): string | undefined {
  const q = query.trim();
  if (!q) return undefined;

  const combined = `${q} ${label || ""}`.toLowerCase();
  const areaHints = [
    "gulshan-e-iqbal",
    "gulshan",
    "clifton",
    "dha",
    "saddar",
    "north nazimabad",
    "nazimabad",
    "malir",
    "korangi",
    "lyari",
    "pechs",
    "bahria",
    "defence",
  ];

  for (const hint of areaHints) {
    if (combined.includes(hint)) {
      if (hint === "gulshan-e-iqbal") return "Gulshan";
      if (hint === "defence") return "DHA";
      if (hint === "north nazimabad") return "Nazimabad";
      return hint.charAt(0).toUpperCase() + hint.slice(1);
    }
  }

  if (q.length >= 3 && q.length <= 30 && !q.includes(",")) {
    return q;
  }

  const first = (label || q).split(",")[0]?.trim();
  if (first && first.length >= 3 && first.length <= 30) {
    return first;
  }

  return undefined;
}

export async function reverseGeocodeLabel(pin: MapPin): Promise<string> {
  try {
    const rows = await Location.reverseGeocodeAsync(pin);
    const row = rows[0];
    if (!row) {
      return `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`;
    }
    const parts = [row.name, row.street, row.district, row.city].filter(Boolean);
    return parts.length ? parts.join(", ") : `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`;
  } catch {
    return `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`;
  }
}

type DirectionTarget = {
  latitude: number;
  longitude: number;
  label?: string;
};

export async function openDirections(
  destination: DirectionTarget,
  origin?: MapPin | null,
) {
  const destLabel = encodeURIComponent(
    destination.label ||
      `${destination.latitude},${destination.longitude}`,
  );
  const destCoords = `${destination.latitude},${destination.longitude}`;

  let url: string;
  if (origin) {
    const originCoords = `${origin.latitude},${origin.longitude}`;
    if (Platform.OS === "ios") {
      url = `http://maps.apple.com/?saddr=${originCoords}&daddr=${destCoords}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destCoords}&travelmode=driving`;
    }
  } else if (Platform.OS === "ios") {
    url = `http://maps.apple.com/?daddr=${destCoords}&q=${destLabel}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${destCoords}&travelmode=driving`;
  }

  const can = await Linking.canOpenURL(url);
  if (!can) {
    throw new Error("Unable to open maps on this device.");
  }
  await Linking.openURL(url);
}

export async function openLocationInMaps(target: DirectionTarget) {
  const label = encodeURIComponent(target.label || "Location");
  const coords = `${target.latitude},${target.longitude}`;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${coords}&q=${label}`
      : `https://www.google.com/maps/search/?api=1&query=${coords}`;

  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("Unable to open maps on this device.");
  await Linking.openURL(url);
}
