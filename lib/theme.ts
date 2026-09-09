export type ThemeCategory = "dark" | "light";

export type ThemeId =
  | "terminal"
  | "midnight"
  | "obsidian"
  | "rose"
  | "slate"
  | "ocean"
  | "nord"
  | "forest"
  | "paper"
  | "warm"
  | "solarized"
  | "github"
  | "mint"
  | "ivory"
  | "petal"
  | "sky";

export interface ThemeTokens {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  category: ThemeCategory;
  tokens: ThemeTokens;
}

export const THEME_STORAGE_KEY = "tubecp-theme";

export const DEFAULT_THEME_ID: ThemeId = "github";

export const DARK_THEMES: ThemeId[] = [
  "terminal",
  "midnight",
  "obsidian",
  "rose",
  "slate",
  "ocean",
  "nord",
  "forest",
];

export const LIGHT_THEMES: ThemeId[] = [
  "paper",
  "warm",
  "solarized",
  "github",
  "mint",
  "ivory",
  "petal",
  "sky",
];

export const ALL_THEMES: ThemeId[] = [...DARK_THEMES, ...LIGHT_THEMES];

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  terminal: {
    id: "terminal",
    label: "Terminal",
    category: "dark",
    tokens: {
      bg: "#0a0a0a",
      surface: "#141414",
      border: "#333333",
      text: "#e0e0e0",
      textMuted: "#888888",
      accent: "#33ff33",
      accentHover: "#66ff66",
    },
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    category: "dark",
    tokens: {
      bg: "#0a0e17",
      surface: "#111827",
      border: "#1e293b",
      text: "#e2e8f0",
      textMuted: "#64748b",
      accent: "#3b82f6",
      accentHover: "#60a5fa",
    },
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    category: "dark",
    tokens: {
      bg: "#0f0f14",
      surface: "#1a1a24",
      border: "#2a2a3a",
      text: "#e4e4ef",
      textMuted: "#8888a0",
      accent: "#a78bfa",
      accentHover: "#c4b5fd",
    },
  },
  rose: {
    id: "rose",
    label: "Rose",
    category: "dark",
    tokens: {
      bg: "#120a0e",
      surface: "#1c1218",
      border: "#3a2030",
      text: "#f0e0e8",
      textMuted: "#a08090",
      accent: "#f472b6",
      accentHover: "#f9a8d4",
    },
  },
  slate: {
    id: "slate",
    label: "Slate",
    category: "dark",
    tokens: {
      bg: "#0f1117",
      surface: "#1a1d27",
      border: "#2d3348",
      text: "#e2e4ea",
      textMuted: "#7a8194",
      accent: "#94a3b8",
      accentHover: "#cbd5e1",
    },
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    category: "dark",
    tokens: {
      bg: "#0a1218",
      surface: "#0f1a24",
      border: "#1a3040",
      text: "#d0e8f0",
      textMuted: "#6090a0",
      accent: "#22d3ee",
      accentHover: "#67e8f9",
    },
  },
  nord: {
    id: "nord",
    label: "Nord",
    category: "dark",
    tokens: {
      bg: "#2e3440",
      surface: "#3b4252",
      border: "#4c566a",
      text: "#eceff4",
      textMuted: "#d8dee9",
      accent: "#88c0d0",
      accentHover: "#8fbcbb",
    },
  },
  forest: {
    id: "forest",
    label: "Forest",
    category: "dark",
    tokens: {
      bg: "#0a120a",
      surface: "#121a12",
      border: "#1a3020",
      text: "#d8f0d8",
      textMuted: "#609060",
      accent: "#4ade80",
      accentHover: "#86efac",
    },
  },
  paper: {
    id: "paper",
    label: "Paper",
    category: "light",
    tokens: {
      bg: "#fafafa",
      surface: "#f0f0f0",
      border: "#cccccc",
      text: "#1a1a1a",
      textMuted: "#666666",
      accent: "#333333",
      accentHover: "#555555",
    },
  },
  warm: {
    id: "warm",
    label: "Warm",
    category: "light",
    tokens: {
      bg: "#faf6f0",
      surface: "#f0ebe0",
      border: "#d4c8b8",
      text: "#2a2010",
      textMuted: "#7a6a50",
      accent: "#b45309",
      accentHover: "#d97706",
    },
  },
  solarized: {
    id: "solarized",
    label: "Solarized",
    category: "light",
    tokens: {
      bg: "#fdf6e3",
      surface: "#eee8d5",
      border: "#93a1a1",
      text: "#073642",
      textMuted: "#586e75",
      accent: "#268bd2",
      accentHover: "#2aa198",
    },
  },
  github: {
    id: "github",
    label: "GitHub",
    category: "light",
    tokens: {
      bg: "#ffffff",
      surface: "#f6f8fa",
      border: "#b0bac4",
      text: "#1f2328",
      textMuted: "#57606a",
      accent: "#0969da",
      accentHover: "#0550ae",
    },
  },
  mint: {
    id: "mint",
    label: "Mint",
    category: "light",
    tokens: {
      bg: "#f0faf4",
      surface: "#e0f5ea",
      border: "#a0d4b8",
      text: "#0a3020",
      textMuted: "#408060",
      accent: "#059669",
      accentHover: "#10b981",
    },
  },
  ivory: {
    id: "ivory",
    label: "Ivory",
    category: "light",
    tokens: {
      bg: "#fffff8",
      surface: "#f5f5ea",
      border: "#d0d0c0",
      text: "#2a2a20",
      textMuted: "#707060",
      accent: "#78716c",
      accentHover: "#57534e",
    },
  },
  petal: {
    id: "petal",
    label: "Petal",
    category: "light",
    tokens: {
      bg: "#fff5f8",
      surface: "#fce8ef",
      border: "#e8b0c8",
      text: "#3a1020",
      textMuted: "#906070",
      accent: "#db2777",
      accentHover: "#ec4899",
    },
  },
  sky: {
    id: "sky",
    label: "Sky",
    category: "light",
    tokens: {
      bg: "#f0f8ff",
      surface: "#e0f0fa",
      border: "#a0c8e8",
      text: "#0a2040",
      textMuted: "#4070a0",
      accent: "#0284c7",
      accentHover: "#0ea5e9",
    },
  },
};

export function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}

export function getThemeCategory(id: ThemeId): ThemeCategory {
  return THEMES[id].category;
}
