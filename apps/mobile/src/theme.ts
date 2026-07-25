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

export const androidColorTokens = {
  background: "@color/job_tracker_background",
  surface: "@color/job_tracker_surface",
  border: "@color/job_tracker_border",
  text: "@color/job_tracker_text",
  muted: "@color/job_tracker_muted",
  primaryLight: "@color/job_tracker_primary_light",
  primaryText: "@color/job_tracker_primary_text",
  dangerLight: "@color/job_tracker_danger_light",
  dangerText: "@color/job_tracker_danger_text",
  warningLight: "@color/job_tracker_warning_light",
  headerBg: "@color/job_tracker_header_bg",
  headerMuted: "@color/job_tracker_header_muted",
  headerText: "@color/job_tracker_header_text",
  tabInactive: "@color/job_tracker_tab_inactive",
  tabInactiveText: "@color/job_tracker_tab_inactive_text",
  tabActive: "@color/job_tracker_tab_active",
  tabActiveText: "@color/job_tracker_tab_active_text",
} as const;

export const colors = {
  bg: dynamicColor("#f4f6f9", "#0b1118", androidColorTokens.background),
  surface: dynamicColor("#ffffff", "#151e28", androidColorTokens.surface),
  border: dynamicColor("#d9e0e8", "#344252", androidColorTokens.border),
  text: dynamicColor("#17202a", "#edf2f7", androidColorTokens.text),
  muted: dynamicColor("#657385", "#9fb0c1", androidColorTokens.muted),
  primary: "#0f8f83",
  primaryLight: dynamicColor("#e7f4f2", "#153d3a", androidColorTokens.primaryLight),
  primaryText: dynamicColor("#0f4f49", "#73ddd2", androidColorTokens.primaryText),
  danger: "#dc2626",
  dangerLight: dynamicColor("#fff1f3", "#3d1b22", androidColorTokens.dangerLight),
  dangerText: dynamicColor("#c01632", "#ff8fa3", androidColorTokens.dangerText),
  warning: "#b45309",
  warningLight: dynamicColor("#fff7ed", "#3b2a16", androidColorTokens.warningLight),
  headerBg: dynamicColor("#17202a", "#080d13", androidColorTokens.headerBg),
  headerMuted: dynamicColor("#9fb0c1", "#8ea0b3", androidColorTokens.headerMuted),
  headerText: dynamicColor("#ffffff", "#f8fafc", androidColorTokens.headerText),
  tabInactive: dynamicColor("#eef2f7", "#202c38", androidColorTokens.tabInactive),
  tabInactiveText: dynamicColor("#475467", "#a9b8c8", androidColorTokens.tabInactiveText),
  tabActive: dynamicColor("#d9f3ef", "#164a45", androidColorTokens.tabActive),
  tabActiveText: dynamicColor("#0f766e", "#7be3d8", androidColorTokens.tabActiveText),
};

const themedStatus = (lightBg: string, lightText: string, darkBg: string, darkText: string, token: string) => ({
  bg: dynamicColor(lightBg, darkBg, `@color/job_tracker_${token}_bg`),
  text: dynamicColor(lightText, darkText, `@color/job_tracker_${token}_text`),
});

export const statusColors: Record<string, { bg: ColorValue; text: ColorValue }> = {
  todo: themedStatus("#eef2f7", "#475467", "#25313e", "#c2cfdd", "status_todo"),
  applied: themedStatus("#dbeafe", "#1d4ed8", "#172e52", "#8bb9ff", "status_applied"),
  screening: themedStatus("#f3e8ff", "#7c3aed", "#35214e", "#c69cff", "status_screening"),
  exam: themedStatus("#fce7f3", "#be185d", "#4b2036", "#ff98c5", "status_exam"),
  interview1: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79", "status_interview"),
  interview2: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79", "status_interview"),
  interview3: themedStatus("#fff7ed", "#c2410c", "#452818", "#ffad79", "status_interview"),
  manager: themedStatus("#ffedd5", "#9a3412", "#4a2516", "#ffb181", "status_manager"),
  hr: themedStatus("#fef3c7", "#a16207", "#423416", "#ffd873", "status_hr"),
  offer: themedStatus("#d1fae5", "#065f46", "#123c32", "#76e2bd", "status_offer"),
  rejected: themedStatus("#fee2e2", "#991b1b", "#491d22", "#ff999f", "status_rejected"),
  silent: themedStatus("#f1f5f9", "#64748b", "#27323e", "#b0bdcb", "status_silent"),
  closed: themedStatus("#f1f5f9", "#64748b", "#27323e", "#b0bdcb", "status_silent"),
};

export const priorityColors: Record<string, { bg: ColorValue; text: ColorValue }> = {
  high: themedStatus("#fee2e2", "#991b1b", "#491d22", "#ff999f", "priority_high"),
  medium: themedStatus("#fef3c7", "#92400e", "#423416", "#ffd873", "priority_medium"),
  low: themedStatus("#eef2f7", "#475467", "#25313e", "#c2cfdd", "priority_low"),
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
