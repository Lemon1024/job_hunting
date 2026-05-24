import { StyleSheet } from "react-native";

export const colors = {
  bg: "#f4f6f9",
  surface: "#ffffff",
  border: "#d9e0e8",
  text: "#17202a",
  muted: "#657385",
  primary: "#0f766e",
  primaryLight: "#e7f4f2",
  primaryText: "#0f4f49",
  danger: "#dc2626",
  dangerLight: "#fff1f3",
  dangerText: "#c01632",
  warning: "#b45309",
  warningLight: "#fff7ed",
  headerBg: "#17202a",
  headerMuted: "#9fb0c1",
  headerText: "#ffffff",
  tabInactive: "#eef2f7",
  tabInactiveText: "#475467",
  tabActive: "#d9f3ef",
  tabActiveText: "#0f766e",
};

export const statusColors: Record<string, { bg: string; text: string }> = {
  todo: { bg: "#eef2f7", text: "#475467" },
  applied: { bg: "#dbeafe", text: "#1d4ed8" },
  screening: { bg: "#f3e8ff", text: "#7c3aed" },
  exam: { bg: "#fce7f3", text: "#be185d" },
  interview1: { bg: "#fff7ed", text: "#c2410c" },
  interview2: { bg: "#fff7ed", text: "#c2410c" },
  interview3: { bg: "#fff7ed", text: "#c2410c" },
  hr: { bg: "#fef3c7", text: "#a16207" },
  offer: { bg: "#d1fae5", text: "#065f46" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  silent: { bg: "#f1f5f9", text: "#64748b" },
  closed: { bg: "#f1f5f9", text: "#64748b" },
};

export const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: "#fee2e2", text: "#991b1b" },
  medium: { bg: "#fef3c7", text: "#92400e" },
  low: { bg: "#eef2f7", text: "#475467" },
};

export const eventDotColors: Record<string, string> = {
  applied: "#3b82f6",
  follow: "#10b981",
  interview: "#f97316",
  offer: "#eab308",
  default: "#94a3b8",
};

export const fonts = {
  bold: "800" as const,
  semibold: "700" as const,
  medium: "500" as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  full: 50,
};

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: { color: colors.headerText, fontWeight: fonts.bold, fontSize: 16 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: { color: colors.primaryText, fontWeight: fonts.bold, fontSize: 14 },
});
