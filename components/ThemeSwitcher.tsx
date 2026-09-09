"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";
import {
  DARK_THEMES,
  LIGHT_THEMES,
  THEMES,
  type ThemeId,
} from "@/lib/theme";
import { cn } from "@/lib/cn";

function ThemeSwatch({ themeId }: { themeId: ThemeId }) {
  const theme = THEMES[themeId];
  return (
    <span className="inline-flex shrink-0 gap-0.5" aria-hidden="true">
      <span className="block size-1.5 border border-border" style={{ background: theme.tokens.bg }} />
      <span className="block size-1.5 border border-border" style={{ background: theme.tokens.surface }} />
      <span className="block size-1.5 border border-border" style={{ background: theme.tokens.accent }} />
    </span>
  );
}

interface Props {
  compact?: boolean;
}

export default function ThemeSwitcher({ compact = false }: Props) {
  const { themeId, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = THEMES[themeId];

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectTheme = (id: ThemeId) => {
    setThemeId(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 border border-border bg-surface font-mono text-[13px] font-medium text-text hover:border-text-muted",
          compact ? "h-[34px] px-3.5" : "px-3 py-2"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select theme"
      >
        <ThemeSwatch themeId={themeId} />
        <span className="whitespace-nowrap">{current.label}</span>
        <CaretDown size={12} weight="bold" className={cn(open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+4px)] right-0 z-[100] min-w-[180px] border border-border bg-bg py-2 max-sm:min-w-[170px]"
          role="listbox"
          aria-label="Themes"
        >
          <div className="flex flex-col">
            <span className="px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest text-text-muted uppercase">
              Dark
            </span>
            {DARK_THEMES.map((id) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={themeId === id}
                className={cn(
                  "flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left font-mono text-xs text-text hover:bg-surface",
                  themeId === id && "bg-surface"
                )}
                onClick={() => selectTheme(id)}
              >
                <ThemeSwatch themeId={id} />
                <span>{THEMES[id].label}</span>
                {themeId === id && (
                  <Check size={14} weight="bold" className="ml-auto shrink-0 text-accent" />
                )}
              </button>
            ))}
          </div>

          <hr className="divider my-1.5" />

          <div className="flex flex-col">
            <span className="px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest text-text-muted uppercase">
              Light
            </span>
            {LIGHT_THEMES.map((id) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={themeId === id}
                className={cn(
                  "flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left font-mono text-xs text-text hover:bg-surface",
                  themeId === id && "bg-surface"
                )}
                onClick={() => selectTheme(id)}
              >
                <ThemeSwatch themeId={id} />
                <span>{THEMES[id].label}</span>
                {themeId === id && (
                  <Check size={14} weight="bold" className="ml-auto shrink-0 text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
