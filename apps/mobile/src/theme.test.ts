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
  it("uses PlatformColor resource paths supported by React Native", () => {
    expect(Object.values(androidColorTokens)).not.toContainEqual(expect.stringContaining("?android:attr/"));
    expect(Object.values(androidColorTokens).every((token) => token.startsWith("?attr/"))).toBe(true);
  });
});
