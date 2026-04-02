import { getNextTheme, getThemeLabel } from "@/lib/theme-utils";

describe("getNextTheme", () => {
  it('returns "light" when current theme is "dark"', () => {
    expect(getNextTheme("dark")).toBe("light");
  });

  it('returns "dark" when current theme is "light"', () => {
    expect(getNextTheme("light")).toBe("dark");
  });

  it('returns "dark" when current theme is undefined (SSR)', () => {
    expect(getNextTheme(undefined)).toBe("dark");
  });

  it('returns "dark" for any unrecognized theme value', () => {
    expect(getNextTheme("system")).toBe("dark");
  });
});

describe("getThemeLabel", () => {
  it('returns "Switch to light mode" when mounted and dark', () => {
    expect(getThemeLabel(true, true)).toBe("Switch to light mode");
  });

  it('returns "Switch to dark mode" when mounted and light', () => {
    expect(getThemeLabel(true, false)).toBe("Switch to dark mode");
  });

  it('returns generic "Toggle theme" when not mounted', () => {
    expect(getThemeLabel(false, false)).toBe("Toggle theme");
    expect(getThemeLabel(false, true)).toBe("Toggle theme");
  });
});
