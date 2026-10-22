"use client";

import KbNotIndexedVideoRow from "@/components/KbNotIndexedVideoRow";
import KbResearchSourcesSection from "@/components/KbResearchSourcesSection";
import type { SkippedKbVideo } from "@/lib/client/workflows";
import { listKbNotIndexedVideos } from "@/lib/client/kb-source-videos";
import type { KbBuildOptions, KnowledgeBase, RankedVideo } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type KbResearchSourcesSheetFocus = "sources" | "skipped";

export interface KbResearchSourcesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focus?: KbResearchSourcesSheetFocus;
  kb: KnowledgeBase;
  sourceVideos: RankedVideo[];
  indexedVideoIds: string[];
  skippedVideos: SkippedKbVideo[];
  buildOptions?: KbBuildOptions;
}

/** Wide research-sources panel (overrides default sheet max-width). */
const SHEET_PANEL_CLASS =
  "flex h-full max-h-svh w-full flex-col gap-0 p-0 sm:!max-w-[min(92vw,40rem)] lg:!max-w-[min(88vw,44rem)]";

export default function KbResearchSourcesSheet({
  open,
  onOpenChange,
  focus = "sources",
  kb,
  sourceVideos,
  indexedVideoIds,
  skippedVideos,
  buildOptions,
}: KbResearchSourcesSheetProps) {
  const indexedCount = sourceVideos.filter((v) => indexedVideoIds.includes(v.videoId)).length;
  const notIndexed = listKbNotIndexedVideos(sourceVideos, indexedVideoIds, skippedVideos);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={SHEET_PANEL_CLASS}>
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5 pr-14">
          <SheetTitle className="text-title">Research sources</SheetTitle>
          <SheetDescription className="text-body-sm leading-relaxed">
            <span className="font-mono tabular-nums">{indexedCount}</span> indexed ·{" "}
            <span className="font-mono tabular-nums">{sourceVideos.length}</span> selected
            {notIndexed.length > 0 ? (
              <>
                {" "}
                · <span className="font-mono tabular-nums">{notIndexed.length}</span> not indexed
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          {notIndexed.length > 0 && (
            <section
              id="kb-skipped-videos"
              className="flex flex-col gap-4"
              tabIndex={focus === "skipped" ? -1 : undefined}
            >
              <div className="space-y-1">
                <h2 className="text-title-sm text-foreground">Not indexed</h2>
                <p className="text-body-sm leading-relaxed text-foreground-secondary">
                  Selected during research but missing from this knowledge base. Open on YouTube or
                  retry when transcripts are available.
                </p>
              </div>
              <Card className="gap-0 overflow-hidden rounded-lg p-0 shadow-none">
                {notIndexed.map((entry) => (
                  <KbNotIndexedVideoRow key={entry.video.videoId} {...entry} />
                ))}
              </Card>
            </section>
          )}

          <section
            id="kb-research-videos"
            className="min-h-0"
            tabIndex={focus === "sources" ? -1 : undefined}
          >
            <KbResearchSourcesSection
              topic={kb.topic}
              videos={sourceVideos}
              kbId={kb.kbId}
              kbStatus={kb.status}
              indexedVideoIds={indexedVideoIds}
              transcriptMode={buildOptions?.transcriptMode ?? kb.buildOptions?.transcriptMode}
              variant="sheet"
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
