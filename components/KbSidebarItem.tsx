"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThree, DownloadSimple, Trash } from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/types";
import { deleteKnowledgeBase } from "@/lib/client/knowledge-base";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface Props {
  kb: KnowledgeBase;
  active: boolean;
}

function buildPercent(kb: KnowledgeBase): number | null {
  const job = kb.buildJob;
  if (!job || job.totalVideos <= 0) return null;
  return Math.min(99, Math.round((job.processedVideos / job.totalVideos) * 100));
}

/**
 * KB row in the sidebar (design system §6.14): link + status badge + options menu.
 * Delete swaps the row to an inline confirmation instead of a modal (§6.13).
 */
export default function KbSidebarItem({ kb, active }: Props) {
  const router = useRouter();
  const { removeKnowledgeBase } = useKnowledgeBases();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    await deleteKnowledgeBase(kb.kbId);
    removeKnowledgeBase(kb.kbId);
    if (active) router.push("/app");
  };

  if (confirming) {
    return (
      <SidebarMenuItem className="px-1 py-1">
        <InlineConfirm
          open
          onOpenChange={setConfirming}
          title={`Delete "${kb.topic}"?`}
          description="This removes its indexed videos and chat history."
          onConfirm={handleDelete}
        />
      </SidebarMenuItem>
    );
  }

  const pct = buildPercent(kb);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={`/app/kb/${kb.kbId}`} prefetch={false} />}
        isActive={active}
        title={kb.topic}
      >
        <span className="truncate">{kb.topic}</span>
      </SidebarMenuButton>

      {kb.status === "building" && (
        <SidebarMenuBadge className="right-9">
          {pct !== null ? `${pct}%` : "…"}
          <span className="sr-only"> building</span>
        </SidebarMenuBadge>
      )}
      {kb.status === "failed" && (
        <SidebarMenuBadge className="right-9 text-destructive">
          Failed
        </SidebarMenuBadge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuAction showOnHover aria-label={`Options for ${kb.topic}`} />}
        >
          <DotsThree weight="bold" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          {kb.status === "ready" && (
            <DropdownMenuItem
              render={<a href={`/api/knowledge-base/${kb.kbId}/export`} download />}
            >
              <DownloadSimple aria-hidden />
              Export
            </DropdownMenuItem>
          )}
          {kb.status === "ready" && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
