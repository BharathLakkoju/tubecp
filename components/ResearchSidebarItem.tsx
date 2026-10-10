"use client";

import Link from "next/link";
import type { SavedResearch } from "@/lib/types";
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export default function ResearchSidebarItem({
  research,
  active,
}: {
  research: SavedResearch;
  active: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={`/app/researches/${research.researchId}`} prefetch={false} />}
        isActive={active}
        className="min-w-0"
      >
        <span className="truncate">{research.topic}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge className="font-mono tabular-nums">
        {research.rankedVideoCount}
      </SidebarMenuBadge>
    </SidebarMenuItem>
  );
}
