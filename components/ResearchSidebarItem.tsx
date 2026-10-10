"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThree, Trash } from "@phosphor-icons/react";
import type { SavedResearch } from "@/lib/types";
import { deleteSavedResearch } from "@/lib/client/saved-research";
import { useResearches } from "@/lib/hooks/useResearches";
import { hrefForSavedResearch, knowledgeBaseIdFromResearchId } from "@/lib/researches";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function ResearchSidebarItem({
  research,
  active,
}: {
  research: SavedResearch;
  active: boolean;
}) {
  const router = useRouter();
  const { removeResearch } = useResearches();
  const [confirming, setConfirming] = useState(false);
  const href = hrefForSavedResearch(research.researchId);
  const isKbMirror = knowledgeBaseIdFromResearchId(research.researchId) !== null;

  const handleDelete = async () => {
    await deleteSavedResearch(research.researchId);
    removeResearch(research.researchId);
    if (active) router.push("/app/researches");
  };

  if (confirming) {
    return (
      <SidebarMenuItem className="px-1 py-1">
        <InlineConfirm
          open
          onOpenChange={setConfirming}
          title={`Remove "${research.topic}"?`}
          description={
            isKbMirror
              ? "Removes this entry from your research library. Your knowledge base is unchanged."
              : "This deletes the saved ranked results for this research."
          }
          onConfirm={handleDelete}
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={href} prefetch={false} />}
        isActive={active}
        title={research.topic}
      >
        <span className="min-w-0 flex-1 truncate">{research.topic}</span>
        <span className="shrink-0 font-mono text-caption tabular-nums text-sidebar-foreground">
          {research.rankedVideoCount}
        </span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuAction showOnHover aria-label={`Options for ${research.topic}`} />}
        >
          <DotsThree weight="bold" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash aria-hidden />
            {isKbMirror ? "Remove from library" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
