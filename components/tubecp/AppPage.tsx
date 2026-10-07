"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** content = 960px (lists), reading = 720px (chat, forms). */
  width?: "content" | "reading";
  /** Optional page header shown next to the sidebar trigger; makes the top bar sticky glass. */
  header?: React.ReactNode;
  className?: string;
}

/**
 * Standard app page frame (design system 5): a slim top bar with the sidebar trigger
 * (the sidebar becomes a sheet below `md`), then a centered column capped at the content width.
 */
export default function AppPage({ children, width = "content", header, className }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className={cn(
          "flex min-h-12 shrink-0 items-center gap-2 px-3",
          header &&
            "sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md backdrop-saturate-150"
        )}
      >
        <SidebarTrigger aria-label="Toggle sidebar (Ctrl+B)" />
        {header && <div className="min-w-0 flex-1">{header}</div>}
      </div>
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-4 pt-2 pb-24 sm:px-6",
          width === "content" ? "max-w-(--content-max)" : "max-w-(--reading-max)",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
