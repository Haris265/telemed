import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { resolveIconUrl, specialityIconName } from "@/lib/specialityIcon";
import type { Doctor, Speciality } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function useCardStyles() {
  const { colors, fonts } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
        },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: "rgba(15,118,110,0.12)",
          alignItems: "center",
          justifyContent: "center",
        },
        avatarText: {
          color: colors.primary,
          fontFamily: fonts.sansExtra,
          fontSize: 15,
        },
        body: {
          flex: 1,
          gap: 4,
        },
        name: {
          color: colors.text,
          fontFamily: fonts.sansBold,
          fontSize: 15,
        },
        meta: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
        },
        tags: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 4,
        },
        action: {
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        },
        actionText: {
          color: colors.primary,
          fontFamily: fonts.sansBold,
          fontSize: 13,
        },
        specCard: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 10,
        },
        specCardActive: {
          borderColor: colors.primary,
          backgroundColor: "rgba(15,118,110,0.10)",
        },
        specIcon: {
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        specIconActive: {
          backgroundColor: colors.primary,
        },
        specImage: {
          width: 44,
          height: 44,
        },
        specIconText: {
          color: colors.text,
          fontFamily: fonts.sansExtra,
          fontSize: 14,
        },
        specName: {
          color: colors.text,
          fontFamily: fonts.sansBold,
          fontSize: 15,
        },
        specNameActive: {
          color: colors.primary,
        },
        specMeta: {
          color: colors.muted,
          fontSize: 12,
          marginTop: 2,
          fontFamily: fonts.sans,
        },
      }),
    [colors, fonts],
  );
}

export function DoctorCard({
  doctor,
  onPress,
  actionLabel = "Book",
}: {
  doctor: Doctor;
  onPress: () => void;
  actionLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useCardStyles();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(doctor.full_name)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>Dr. {doctor.full_name}</Text>
        <Text style={styles.meta}>{doctor.session_time} min session</Text>
        {doctor.specialities?.length ? (
          <View style={styles.tags}>
            {doctor.specialities.slice(0, 3).map((s) => (
              <Badge key={s.id} label={s.name} tone="info" />
            ))}
            {doctor.specialities.length > 3 ? (
              <Badge label={`+${doctor.specialities.length - 3}`} tone="neutral" />
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.action}>
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function SpecialityIcon({
  name,
  displayIcon,
  active,
}: {
  name: string;
  displayIcon?: string;
  active?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useCardStyles();
  const [imgFailed, setImgFailed] = useState(false);
  const uri = resolveIconUrl(displayIcon);
  const showImage = !!uri && !imgFailed;
  const tint = active ? "#fff" : colors.primary;

  return (
    <View style={[styles.specIcon, active && styles.specIconActive]}>
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={styles.specImage}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Ionicons name={specialityIconName(name)} size={22} color={tint} />
      )}
    </View>
  );
}

export function SpecialityCard({
  item,
  active,
  doctorCount,
  onPress,
}: {
  item: Speciality;
  active?: boolean;
  doctorCount?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useCardStyles();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.specCard,
        active && styles.specCardActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <SpecialityIcon
        name={item.name}
        displayIcon={item.display_icon}
        active={active}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.specName, active && styles.specNameActive]}>{item.name}</Text>
        {typeof doctorCount === "number" ? (
          <Text style={styles.specMeta}>
            {doctorCount} doctor{doctorCount === 1 ? "" : "s"}
          </Text>
        ) : (
          <Text style={styles.specMeta}>Tap to view doctors</Text>
        )}
      </View>
      <Ionicons
        name={active ? "checkmark-circle" : "chevron-forward"}
        size={20}
        color={active ? colors.primary : colors.muted}
      />
    </Pressable>
  );
}
