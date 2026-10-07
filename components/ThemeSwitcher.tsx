"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showLabel?: boolean;
}

/** One-tap light/dark toggle. The account menu offers the explicit radio group. */
export default function ThemeSwitcher({ className, showLabel = false }: Props) {
  const { colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === "dark";

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      className={cn(className)}
      onClick={toggleColorMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
      {showLabel && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </Button>
  );
}
