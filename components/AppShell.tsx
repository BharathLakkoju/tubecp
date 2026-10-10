"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Books, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useAuthSession } from "@/components/AuthShell";
import AppAccountMenu from "@/components/AppAccountMenu";
import KbSidebarItem from "@/components/KbSidebarItem";
import ResearchSidebarItem from "@/components/ResearchSidebarItem";
import Wordmark from "@/components/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import UsageIndicator from "@/components/UsageIndicator";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import { useResearches } from "@/lib/hooks/useResearches";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { cn } from "@/lib/utils";

/** Sidebar shows at most this many knowledge bases, then "View all" (design system §6.14). */
const MAX_SIDEBAR_KBS = 8;
const MAX_SIDEBAR_RESEARCHES = 8;

/** Close the mobile nav sheet after route changes (design system: navigation-only overlay). */
function SidebarMobileRouteSync() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return null;
}

/**
 * App shell (design system §6.14): shadcn Sidebar family + SidebarInset.
 * On mobile the Sidebar becomes a Sheet (the one allowed overlay: navigation only).
 * Cmd/Ctrl+B toggles the sidebar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sub = useSubscription();
  const { data: session } = useAuthSession();
  const { knowledgeBases, loading } = useKnowledgeBases();
  const { researches, loading: researchesLoading } = useResearches();

  const activeKbId = pathname.startsWith("/app/kb/") ? (pathname.split("/")[3] ?? null) : null;
  const activeResearchId = (() => {
    if (pathname.startsWith("/app/researches/")) {
      const id = pathname.split("/")[3];
      return id ? decodeURIComponent(id) : null;
    }
    if (pathname.startsWith("/app/kb/")) {
      const kbId = pathname.split("/")[3];
      return kbId ? `kb:${kbId}` : null;
    }
    return null;
  })();
  const visibleKbs = knowledgeBases.slice(0, MAX_SIDEBAR_KBS);
  const hiddenKbCount = knowledgeBases.length - visibleKbs.length;
  const visibleResearches = researches.slice(0, MAX_SIDEBAR_RESEARCHES);
  const hiddenResearchCount = researches.length - visibleResearches.length;

  const usage = sub.canBuildKb
    ? { used: sub.kbBuildsUsed, limit: sub.kbBuildsLimit, label: "KB builds" }
    : { used: sub.researchUsedToday, limit: sub.researchLimit, label: "researches today" };

  return (
    <SidebarProvider style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}>
      <SidebarMobileRouteSync />
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-[60] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-label focus-visible:text-primary-foreground"
      >
        Skip to content
      </a>

      <Sidebar collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="gap-3 p-3">
          <Link href="/app" className="rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark size="sm" />
          </Link>
          <Link
            href="/app"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full justify-start")}
          >
            <Plus data-icon="inline-start" weight="bold" aria-hidden />
            New research
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel render={<Link href="/app/researches" prefetch={false} />}>
              <MagnifyingGlass aria-hidden className="mr-2" />
              Researches
            </SidebarGroupLabel>
            <SidebarGroupAction render={<Link href="/app" prefetch={false} />} aria-label="New research">
              <Plus aria-hidden />
            </SidebarGroupAction>

            <SidebarMenu aria-label="Researches">
              {researchesLoading && researches.length === 0 && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                </>
              )}
              {!researchesLoading && researches.length === 0 && (
                <li className="px-2 py-2 text-label text-muted-foreground">No researches yet</li>
              )}
              {visibleResearches.map((research) => (
                <ResearchSidebarItem
                  key={research.researchId}
                  research={research}
                  active={activeResearchId === research.researchId}
                />
              ))}
              {hiddenResearchCount > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/app/researches" prefetch={false} />}
                    size="sm"
                    className="text-foreground-secondary"
                  >
                    View all{" "}
                    <span className="font-mono tabular-nums">({researches.length})</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel render={<Link href="/app/kb" prefetch={false} />}>
              <Books aria-hidden className="mr-2" />
              Knowledge bases
            </SidebarGroupLabel>
            {sub.canBuildKb && (
              <SidebarGroupAction render={<Link href="/app" prefetch={false} />} aria-label="New research">
                <Plus aria-hidden />
              </SidebarGroupAction>
            )}

            {sub.canBuildKb ? (
              <SidebarMenu aria-label="Knowledge bases">
                {loading && knowledgeBases.length === 0 && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  </>
                )}
                {!loading && knowledgeBases.length === 0 && (
                  <li className="px-2 py-2 text-label text-muted-foreground">No knowledge bases yet</li>
                )}
                {visibleKbs.map((kb) => (
                  <KbSidebarItem key={kb.kbId} kb={kb} active={activeKbId === kb.kbId} />
                ))}
                {hiddenKbCount > 0 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/app/kb" prefetch={false} />}
                      size="sm"
                      className="text-foreground-secondary"
                    >
                      View all <span className="font-mono tabular-nums">({knowledgeBases.length})</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-2 text-label text-foreground-secondary">
                Knowledge bases are on paid plans.{" "}
                <Link href="/pricing" className="text-primary underline underline-offset-2">
                  See plans
                </Link>
              </p>
            )}
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 border-t p-3">
          {!sub.loading && sub.researchLimit > 0 && session?.user && (
            <UsageIndicator used={usage.used} limit={usage.limit} label={usage.label} />
          )}
          <AppAccountMenu />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset id="main-content" className="min-w-0">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
