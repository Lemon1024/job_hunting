import type { ThemePreference } from "@job-tracker/core";

export type ResolvedTheme = "light" | "dark";

export function resolveThemePreference(preference: ThemePreference, systemScheme?: string | null): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemScheme === "dark" ? "dark" : "light";
}
