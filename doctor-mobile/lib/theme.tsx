import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useFonts } from "expo-font";
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from "@expo-google-fonts/source-serif-4";
import * as SplashScreen from "expo-splash-screen";

import { colors, fonts, type ThemeColors } from "@/constants/theme";

type ThemeContextValue = {
  colors: ThemeColors;
  fonts: typeof fonts;
  fontsReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

void SplashScreen.preventAutoHideAsync().catch(() => {});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      fonts,
      fontsReady: fontsLoaded,
    }),
    [fontsLoaded],
  );

  if (!fontsLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
