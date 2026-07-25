import { describe, expect, it } from "@jest/globals";
import { androidColorTokens } from "./theme";
import { resolveThemePreference } from "./themePreference";

describe("resolveThemePreference", () => {
  it("honors explicit light and dark preferences", () => {
    expect(resolveThemePreference("light", "dark")).toBe("light");
    expect(resolveThemePreference("dark", "light")).toBe("dark");
  });

  it("tracks system theme and defaults safely", () => {
    expect(resolveThemePreference("system", "dark")).toBe("dark");
    expect(resolveThemePreference("system", null)).toBe("light");
  });
});

describe("Android theme colors", () => {
  it("uses visible app-owned resources for every semantic color", () => {
    const tokens = Object.values(androidColorTokens);

    expect(tokens.every((token) => token.startsWith("@color/job_tracker_"))).toBe(true);
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});
