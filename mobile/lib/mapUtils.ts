import { Linking, Platform } from "react-native";
import * as Location from "expo-location";

import type { MapPin } from "@/components/ClinicMap";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  /** Full text shown in search bar after selection */
  label: string;
  /** Main place name */
  title: string;
  /** City / area line shown in grey */
  subtitle: string;
  /** Google-style first line: "Gulshan-e-Iqbal Karachi" */
  primaryLine: string;
  /** Optional second line with street/detail */
  detailLine: string;
};

const URDU_SCRIPT = /[\u0600-\u06FF\u0750-\u077F]/;

function isLatinText(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return !URDU_SCRIPT.test(value);
}

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value || !isLatinText(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function pickLatin(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && isLatinText(trimmed)) return trimmed;
  }
  return "";
}

function capitalizeWords(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildGeocodeResult(
  latitude: number,
  longitude: number,
  title: string,
  subtitleParts: Array<string | null | undefined>,
  detailParts: Array<string | null | undefined> = [],
): GeocodeResult | null {
  const cleanTitle = pickLatin(title);
  if (!cleanTitle) return null;

  const subtitle = uniqueParts(subtitleParts).join(", ");
  const detailLine = uniqueParts(detailParts).join(", ");
  const city = subtitleParts.find((p) => p && /karachi/i.test(p)) || subtitle.split(",")[0] || "Karachi";
  const primaryLine = `${cleanTitle} ${pickLatin(city) || "Karachi"}`.replace(/\s+/g, " ").trim();
  const label = detailLine
    ? `${primaryLine}, ${detailLine}`
    : subtitle
      ? `${cleanTitle}, ${subtitle}`
      : primaryLine;

  return {
    latitude,
    longitude,
    title: cleanTitle,
    subtitle: subtitle || pickLatin(city) || "Karachi",
    primaryLine,
    detailLine,
    label,
  };
}

function formatExpoGeocodeRow(
  row: Location.LocationGeocodedAddress,
  queryHint?: string,
): GeocodeResult | null {
  const hint = capitalizeWords(queryHint?.trim() || "");
  const title =
    pickLatin(row.name, row.street, row.district, row.subregion, row.city, row.region) ||
    hint;

  if (!title) return null;

  return buildGeocodeResult(
    row.latitude,
    row.longitude,
    title,
    [row.city, row.region, row.country],
    [row.street, row.district],
  );
}

type NominatimRow = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
};

function formatNominatimRow(row: NominatimRow, queryHint?: string): GeocodeResult | null {
  const displayParts = row.display_name
    .split(",")
    .map((s) => s.trim())
    .filter((s) => isLatinText(s));

  const addr = row.address || {};
  const area = pickLatin(
    addr.neighbourhood,
    addr.suburb,
    addr.city_district,
    addr.town,
  );
  const city = pickLatin(addr.city, addr.town, displayParts.find((p) => /karachi/i.test(p)));
  const road = pickLatin(
    addr.road ? `${addr.road}${addr.house_number ? ` ${addr.house_number}` : ""}` : "",
  );

  const title =
    pickLatin(row.name, area, road, displayParts[0]) ||
    capitalizeWords(queryHint || "");

  if (!title) return null;

  return buildGeocodeResult(
    parseFloat(row.lat),
    parseFloat(row.lon),
    title,
    [city, addr.state, addr.country],
    [road, area, ...displayParts.slice(1, 3)],
  );
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    locality?: string;
  };
};

function formatPhotonFeature(feature: PhotonFeature, queryHint?: string): GeocodeResult | null {
  const [lon, lat] = feature.geometry.coordinates;
  const p = feature.properties;

  const title =
    pickLatin(p.name, p.locality, p.district) || capitalizeWords(queryHint || "");
  if (!title) return null;

  const city = pickLatin(p.city) || "Karachi";

  return buildGeocodeResult(
    lat,
    lon,
    title,
    [city, p.state, p.country],
    [p.street, p.district, p.locality],
  );
}

async function geocodeWithPhoton(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&limit=6&lang=en&bbox=66.85,24.75,67.35,25.15`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];

  const data = (await res.json()) as { features?: PhotonFeature[] };
  const hint = query.split(",")[0]?.trim();
  return (data.features || [])
    .map((feature) => formatPhotonFeature(feature, hint))
    .filter((row): row is GeocodeResult => row !== null);
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=6` +
    `&addressdetails=1&countrycodes=pk&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "TeleMedMobile/1.0",
    },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as NominatimRow[];
  const hint = query.split(",")[0]?.trim();

  return rows
    .map((row) => formatNominatimRow(row, hint))
    .filter((row): row is GeocodeResult => row !== null);
}

export async function geocodePlace(
  query: string,
  queryHint?: string,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const hint = capitalizeWords(queryHint?.trim() || q);
  const attempts = [`${q}, Karachi, Pakistan`, q];

  const seen = new Set<string>();
  const results: GeocodeResult[] = [];

  for (const attempt of attempts) {
    try {
      const rows = await Location.geocodeAsync(attempt);
      for (const row of rows) {
        const key = `${row.latitude.toFixed(5)},${row.longitude.toFixed(5)}`;
        if (seen.has(key)) continue;
        const formatted = formatExpoGeocodeRow(row, hint);
        if (!formatted) continue;
        seen.add(key);
        results.push(formatted);
      }
      if (results.length) break;
    } catch {
      // try next query variant
    }
  }

  return results.slice(0, 6);
}

function mergeUniqueResults(
  target: GeocodeResult[],
  incoming: GeocodeResult[],
  seen: Set<string>,
) {
  for (const row of incoming) {
    const key = `${row.latitude.toFixed(4)},${row.longitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(row);
  }
}

/** Google Maps style English place search. */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const merged: GeocodeResult[] = [];

  const attempts = [`${q}, Karachi`, `${q}, Karachi, Pakistan`, q];

  for (const attempt of attempts) {
    try {
      const rows = await geocodeWithPhoton(attempt);
      mergeUniqueResults(merged, rows, seen);
      if (merged.length >= 3) break;
    } catch {
      // try next photon query
    }
  }

  if (merged.length < 3) {
    for (const attempt of attempts) {
      try {
        const rows = await geocodeWithNominatim(attempt);
        mergeUniqueResults(merged, rows, seen);
        if (merged.length >= 3) break;
      } catch {
        // try next nominatim query
      }
    }
  }

  if (!merged.length) {
    try {
      const rows = await geocodePlace(q, q);
      mergeUniqueResults(merged, rows, seen);
    } catch {
      // device geocoder unavailable
    }
  }

  return merged.slice(0, 5);
}

/** Extract area token from search text for clinic area filtering. */
export function extractAreaFromSearch(
  query: string,
  label?: string,
  title?: string,
): string | undefined {
  const q = query.trim();
  if (!q) return undefined;

  const combined = `${q} ${title || ""} ${label || ""}`.toLowerCase();
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
    return capitalizeWords(q);
  }

  const first = (title || label || q).split(",")[0]?.trim();
  if (first && first.length >= 3 && first.length <= 30 && isLatinText(first)) {
    return first;
  }

  return undefined;
}

export async function reverseGeocodeLabel(pin: MapPin): Promise<string> {
  try {
    const url =
      `https://photon.komoot.io/reverse?lat=${pin.latitude}&lon=${pin.longitude}&lang=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = (await res.json()) as { features?: PhotonFeature[] };
      const feature = data.features?.[0];
      if (feature) {
        const formatted = formatPhotonFeature(feature);
        if (formatted) return formatted.label;
      }
    }
  } catch {
    // fall back to device geocoder
  }

  try {
    const rows = await Location.reverseGeocodeAsync(pin);
    const row = rows[0];
    if (!row) {
      return `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`;
    }
    const parts = uniqueParts([row.name, row.street, row.district, row.city]);
    return parts.length
      ? parts.join(", ")
      : `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`;
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
