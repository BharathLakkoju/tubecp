export type ColorMode = "light" | "dark";

export const THEME_STORAGE_KEY = "tubecp-color-mode";

export const DEFAULT_COLOR_MODE: ColorMode = "light";

export function isColorMode(value: string): value is ColorMode {
  return value === "light" || value === "dark";
}

/** Map legacy multi-theme ids to light/dark. */
export function migrateLegacyTheme(value: string): ColorMode {
  if (isColorMode(value)) return value;

  const darkThemes = new Set([
    "terminal",
    "midnight",
    "obsidian",
    "rose",
    "slate",
    "ocean",
    "nord",
    "forest",
  ]);

  if (darkThemes.has(value)) return "dark";
  return "light";
}
