import { StyleSheet, View } from "react-native";

import { useTheme } from "@/lib/theme";

/** Soft clinic atmosphere behind screens (mint wash + gentle shapes). */
export function ClinicBackdrop() {
  const { colors } = useTheme();

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} pointerEvents="none">
      <View
        style={[
          styles.blobTop,
          { backgroundColor: colors.bgAccent },
        ]}
      />
      <View
        style={[
          styles.blobBottom,
          { backgroundColor: colors.bgSoft },
        ]}
      />
      <View
        style={[
          styles.band,
          { backgroundColor: colors.primary + "0F" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blobTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.9,
  },
  blobBottom: {
    position: "absolute",
    bottom: 80,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.85,
  },
  band: {
    position: "absolute",
    top: "28%",
    left: 0,
    right: 0,
    height: 180,
    transform: [{ skewY: "-6deg" }],
  },
});
