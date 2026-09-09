"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
} from "@/lib/theme";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;

  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_ID;

    if (isThemeId(raw)) return raw;

    const parsed = JSON.parse(raw) as { mode?: string; vibe?: string; themeId?: string };
    if (parsed.themeId && isThemeId(parsed.themeId)) return parsed.themeId;

    // Migrate legacy mode+vibe storage
    if (parsed.mode === "dark") {
      if (parsed.vibe === "ocean") return "ocean";
      if (parsed.vibe === "forest") return "forest";
      return "midnight";
    }
    return DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

function applyThemeToDocument(themeId: ThemeId) {
  document.documentElement.dataset.themeId = themeId;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeIdState(stored);
    applyThemeToDocument(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyThemeToDocument(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId, ready]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
  }, []);

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId, setThemeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeTokens() {
  const { themeId } = useTheme();
  return THEMES[themeId].tokens;
}
