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
  DEFAULT_COLOR_MODE,
  THEME_STORAGE_KEY,
  isColorMode,
  migrateLegacyTheme,
  type ColorMode,
} from "@/lib/theme";

interface ThemeContextValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredColorMode(): ColorMode {
  if (typeof window === "undefined") return DEFAULT_COLOR_MODE;

  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_COLOR_MODE;

    if (isColorMode(raw)) return raw;

    const parsed = JSON.parse(raw) as { mode?: string; themeId?: string };
    if (parsed.themeId) return migrateLegacyTheme(parsed.themeId);
    if (parsed.mode === "dark" || parsed.mode === "light") return parsed.mode;

    return migrateLegacyTheme(raw);
  } catch {
    return DEFAULT_COLOR_MODE;
  }
}

function applyColorMode(mode: ColorMode) {
  document.documentElement.dataset.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredColorMode();
    setColorModeState(stored);
    applyColorMode(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyColorMode(colorMode);
    localStorage.setItem(THEME_STORAGE_KEY, colorMode);
  }, [colorMode, ready]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((mode) => (mode === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({ colorMode, setColorMode, toggleColorMode }),
    [colorMode, setColorMode, toggleColorMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
