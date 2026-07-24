import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Appearance,
  DynamicColorIOS,
  Platform,
  PlatformColor,
  StyleSheet,
  useColorScheme,
  type ColorValue,
} from "react-native";
import type { ThemePreference } from "@job-tracker/core";
import { resolveThemePreference, type ResolvedTheme } from "./themePreference";

export { resolveThemePreference, type ResolvedTheme } from "./themePreference";

function dynamicColor(light: string, dark: string, androidToken: string): ColorValue {
  if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  if (Platform.OS === "android") return PlatformColor(androidToken);
  return light;
}

export const colors = {
  bg: dynamicColor("#f4f6f9", "#0b1118", "?android:attr/colorBackground"),
  surface: dynamicColor("#ffffff", "#151e28", "?android:attr/colorBackground"),
  border: dynamicColor("#d9e0e8", "#344252", "?android:attr/textColorTertiary"),
  text: dynamicColor("#17202a", "#edf2f7", "?android:attr/textColorPrimary"),
  muted: dynamicColor("#657385", "#9fb0c1", "?android:attr/textColorSecondary"),
  primary: "#0f8f83",
  primaryLight: dynamicColor("#e7f4f2", "#153d3a", "?android:attr/colorControlHighlight"),
  primaryText: dynamicColor("#0f4f49", "#73ddd2", "?android:attr/textColorPrimary"),
  danger: "#dc2626",
  dangerLight: dynamicColor("#fff1f3", "#3d1b22", "?android:attr/colorControlHighlight"),
  dangerText: dynamicColor("#c01632", "#ff8fa3", "?android:attr/textColorPrimary"),
  warning: "#b45309",
  warningLight: dynamicColor("#fff7ed", "#3b2a16", "?android:attr/colorControlHighlight"),
  headerBg: dynamicColor("#17202a", "#080d13", "?android:attr/colorBackground"),
  headerMuted: dynamicColor("#9fb0c1", "#8ea0b3", "?android:attr/textColorSecondary"),
  headerText: dynamicColor("#ffffff", "#f8fafc", "?android:attr/textColorPrimary"),
  tabInactive: dynamicColor("#eef2f7", "#202c38", "?android:attr/colorControlHighlight"),
  tabInactiveText: dynamicColor("#475467", "#a9b8c8", "?android:attr/textColorSecondary"),
  tabActive: dynamicColor("#d9f3ef", "#164a45", "?android:attr/colorControlHighlight"),
  tabActiveText: dynamicColor("#0f766e", "#7be3d8", "?android:attr/textColorPrimary"),
};

const themedStatus = (lightBg: string, lightText: string, darkBg: string, darkText: string) => ({
  bg: dynamicColor(lightBg, darkBg, "?android:attr/colorControlHighlight"),
  text: dynamicColor(lightText, darkText, "?android:attr/textColorPrimary"),
});

export const statusColors: Record<string, { bg: ColorValue; text: ColorValue }> = {
  todo: themedStatus("#eef2f7", "#475467", "#25313e", "#c2cfdd"),
  applied: themedStatus("#dbeafe", "#1d4ed8", "#172e52", "#8bb9ff"),
  screening: themedStatus("#f3e8ff", "#7c3aed", "#35214e", "#c69cff"),
  exam: themedStatus("#fce7f3", "#be185d", "#4b2036", "#ff98c5"),
  interview1: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79"),
  interview2: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79"),
  interview3: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79"),
  manager: themedStatus("#ffedd5", "#9a3412", "#4a2516", "#ffb181"),
  hr: themedStatus("#fef3c7", "#a16207", "#423416", "#ffd873"),
  offer: themedStatus("#d1fae5", "#065f46", "#123c32", "#76e2bd"),
  rejected: themedStatus("#fee2e2", "#991b1b", "#491d22", "#ff999f"),
  silent: themedStatus("#f1f5f9", "#64748b", "#27323e", "#b0bdcb"),
  closed: themedStatus("#f1f5f9", "#64748b", "#27323e", "#b0bdcb"),
};

export const priorityColors: Record<string, { bg: ColorValue; text: ColorValue }> = {
  high: themedStatus("#fee2e2", "#991b1b", "#491d22", "#ff999f"),
  medium: themedStatus("#fef3c7", "#92400e", "#423416", "#ffd873"),
  low: themedStatus("#eef2f7", "#475467", "#25313e", "#c2cfdd"),
};

export const eventDotColors: Record<string, string> = {
  applied: "#3b82f6",
  follow: "#10b981",
  "follow-task": "#14b8a6",
  interview: "#f97316",
  offer: "#eab308",
  default: "#94a3b8",
};

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolvedTheme: "light",
  setPreference: () => undefined,
});

const THEME_STORAGE_KEY = "job-tracker.theme-preference";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "system" || stored === "light" || stored === "dark") setPreferenceState(stored);
    }).catch(() => undefined);
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? null : preference);
    return () => Appearance.setColorScheme(null);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme: resolveThemePreference(preference, systemScheme),
    setPreference,
  }), [preference, systemScheme]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export const fonts = {
  bold: "800" as const,
  semibold: "700" as const,
  medium: "500" as const,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const radius = { sm: 6, md: 8, lg: 10, xl: 12, full: 50 };

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, fontSize: 15, color: colors.text },
  primaryButton: { minHeight: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.headerText, fontWeight: fonts.bold, fontSize: 16 },
  secondaryButton: { minHeight: 44, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.primaryText, fontWeight: fonts.bold, fontSize: 14 },
});
