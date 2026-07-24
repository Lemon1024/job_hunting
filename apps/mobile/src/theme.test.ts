import { describe, expect, it } from "@jest/globals";
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
