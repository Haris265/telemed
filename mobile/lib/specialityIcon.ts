import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

const RULES: { match: RegExp; icon: IconName }[] = [
  { match: /cardio|heart|cardiac/i, icon: "heart" },
  { match: /dental|dentist|orthodont/i, icon: "happy-outline" },
  { match: /derm|skin|cosmetic/i, icon: "sparkles-outline" },
  { match: /ent|ear|nose|throat|otolaryng/i, icon: "ear-outline" },
  { match: /eye|ophthal|optom/i, icon: "eye-outline" },
  { match: /gynae|gynec|obstetric|ob.?gyn|women/i, icon: "female-outline" },
  { match: /neuro|brain|nerve/i, icon: "flash-outline" },
  { match: /ortho|bone|fracture|joint|spine/i, icon: "body-outline" },
  { match: /pedia|child|neonat/i, icon: "accessibility-outline" },
  { match: /psych|mental|counsel/i, icon: "happy-outline" },
  { match: /pulmon|chest|lung|respirat|asthma/i, icon: "leaf-outline" },
  { match: /urolog|kidney|renal|nephro/i, icon: "water-outline" },
  { match: /gastro|digest|liver|hepat/i, icon: "nutrition-outline" },
  { match: /oncolog|cancer|tumor/i, icon: "ribbon-outline" },
  { match: /endocrin|diabet|thyroid|hormon/i, icon: "pulse-outline" },
  { match: /general|family|gp|internal|medicine|physician/i, icon: "medkit-outline" },
  { match: /surg/i, icon: "cut-outline" },
  { match: /radiolog|imaging|x.?ray|scan/i, icon: "scan-outline" },
  { match: /physiotherap|rehab|physio/i, icon: "fitness-outline" },
  { match: /allerg|immun/i, icon: "shield-checkmark-outline" },
  { match: /rheumat|arthritis/i, icon: "hand-left-outline" },
  { match: /hematolog|blood/i, icon: "water-outline" },
  { match: /infect|fever/i, icon: "thermometer-outline" },
  { match: /anesthes/i, icon: "medical-outline" },
  { match: /emergenc|trauma|casualty/i, icon: "alert-circle-outline" },
  { match: /nutrition|diet/i, icon: "restaurant-outline" },
  { match: /ayurved|homeopath|alternative/i, icon: "leaf-outline" },
];

export function specialityIconName(name: string): IconName {
  for (const rule of RULES) {
    if (rule.match.test(name)) return rule.icon;
  }
  return "medical-outline";
}

export function isIconUrl(value?: string | null) {
  if (!value) return false;
  const v = value.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("/") ||
    v.startsWith("data:")
  );
}

export function resolveIconUrl(value?: string | null) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith("data:")) return v;
  if (v.startsWith("/")) {
    const base = (
      process.env.EXPO_PUBLIC_API_URL || "https://telemed-api.hnhsofttechsolutions.com"
    ).replace(/\/+$/, "");
    return `${base}${v}`;
  }
  return null;
}
