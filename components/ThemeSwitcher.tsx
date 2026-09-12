"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/cn";

interface Props {
  className?: string;
  showLabel?: boolean;
  variant?: "menu" | "icon";
}

export default function ThemeSwitcher({
  className,
  showLabel = false,
  variant = "menu",
}: Props) {
  const { colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === "dark";

  return (
    <button
      type="button"
      className={cn(
        variant === "menu" ? "app-menu-item" : "theme-icon-toggle",
        className
      )}
      onClick={toggleColorMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={16} weight="regular" aria-hidden /> : <Moon size={16} weight="regular" aria-hidden />}
      {showLabel && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
