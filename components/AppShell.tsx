"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Books,
  CaretDown,
  Plus,
  X,
} from "@phosphor-icons/react";
import { AppShellProvider } from "@/lib/contexts/AppShellContext";
import AnimatedCollapse from "@/components/AnimatedCollapse";
import Wordmark from "@/components/Wordmark";
import AppAccountMenu from "@/components/AppAccountMenu";
import KbSidebarItem from "@/components/KbSidebarItem";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { cn } from "@/lib/cn";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sub = useSubscription();
  const { knowledgeBases, loading: kbsLoading } = useKnowledgeBases();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kbExpanded, setKbExpanded] = useState(() => pathname.startsWith("/app/kb/"));

  const activeKbId = pathname.startsWith("/app/kb/")
    ? pathname.split("/")[3] ?? null
    : null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/app/kb/")) {
      setKbExpanded(true);
    }
  }, [pathname]);

  const toggleKbSection = () => {
    setKbExpanded((open) => !open);
  };

  return (
    <AppShellProvider mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
    <div className="app-shell">
      {mobileOpen && (
        <button
          type="button"
          className="app-shell-backdrop md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn("app-sidebar", mobileOpen && "app-sidebar-open")}>
        <div className="app-sidebar-header">
          <button
            type="button"
            className="app-sidebar-close md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} weight="bold" />
          </button>
          <Link href="/app" className="app-sidebar-brand no-underline" onClick={() => setMobileOpen(false)}>
            <Wordmark size="sm" />
          </Link>
        </div>

        <div className="app-sidebar-top">
          <Link
            href="/app"
            className={cn(
              "app-sidebar-new",
              pathname === "/app" && !activeKbId && "app-sidebar-new-active"
            )}
          >
            <Plus size={16} weight="bold" aria-hidden />
            New research
          </Link>
        </div>

        <nav className="app-sidebar-nav" aria-label="App">
          {sub.canBuildKb && (
            <div
              className={cn(
                "app-sidebar-section",
                kbExpanded && "app-sidebar-section-expanded"
              )}
            >
              <button
                type="button"
                className={cn(
                  "app-sidebar-section-toggle",
                  activeKbId && "app-sidebar-section-toggle-active"
                )}
                onClick={toggleKbSection}
                aria-expanded={kbExpanded}
              >
                <Books size={18} weight="regular" aria-hidden />
                <span className="flex-1 text-left">Knowledge bases</span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={cn("app-sidebar-caret", kbExpanded && "app-sidebar-caret-open")}
                  aria-hidden
                />
              </button>

              <AnimatedCollapse open={kbExpanded} innerClassName="app-sidebar-kb-collapse">
                <ul className="app-sidebar-kb-list">
                  {kbsLoading && (
                    <li className="app-sidebar-kb-empty">Loading…</li>
                  )}
                  {!kbsLoading && knowledgeBases.length === 0 && (
                    <li className="app-sidebar-kb-empty">No knowledge bases yet</li>
                  )}
                  {knowledgeBases.map((kb) => (
                    <KbSidebarItem
                      key={kb.kbId}
                      kb={kb}
                      active={activeKbId === kb.kbId}
                    />
                  ))}
                </ul>
              </AnimatedCollapse>
            </div>
          )}
        </nav>

        <div className="app-sidebar-footer">
          <AppAccountMenu />
        </div>
      </aside>

      <div className="app-main">
        <div className="app-main-inner">{children}</div>
      </div>
    </div>
    </AppShellProvider>
  );
}
