/** Returns the opposite theme. */
export function getNextTheme(current: string | undefined): "light" | "dark" {
  return current === "dark" ? "light" : "dark";
}

/** Returns an accessible label describing the toggle action. */
export function getThemeLabel(mounted: boolean, isDark: boolean): string {
  return mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme";
}
