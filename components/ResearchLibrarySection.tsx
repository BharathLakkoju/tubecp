"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KbResearchSourcesSection from "@/components/KbResearchSourcesSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CaretRight } from "@phosphor-icons/react";
import type { KbTranscriptMode, RankedVideo } from "@/lib/types";

type ResearchSourceItem = {
  kbId: string;
  topic: string;
  status: "building" | "ready" | "failed";
  createdAt: string;
  transcriptMode: KbTranscriptMode;
  rankedVideos: RankedVideo[];
};

export default function ResearchLibrarySection() {
  const [items, setItems] = useState<ResearchSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKbId, setOpenKbId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/knowledge-base/research-sources");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const list = (data.items ?? []) as ResearchSourceItem[];
        setItems(list);
        if (list[0]) setOpenKbId(list[0].kbId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-10" aria-labelledby="research-library-heading">
      <div>
        <h2 id="research-library-heading" className="text-title text-foreground">
          Your researched videos
        </h2>
        <p className="mt-1 text-body-sm text-foreground-secondary">
          Ranked videos saved from past knowledge base builds — open any topic to review what was
          analyzed.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Collapsible
            key={item.kbId}
            open={openKbId === item.kbId}
            onOpenChange={(open) => setOpenKbId(open ? item.kbId : null)}
          >
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-1 w-fit data-panel-open:[&>svg]:rotate-90"
                  />
                }
              >
                <CaretRight className="transition-transform duration-(--duration-base)" aria-hidden />
                <span className="text-body-sm font-medium text-foreground">{item.topic}</span>
              </CollapsibleTrigger>
              <Badge variant="secondary" className="font-mono tabular-nums">
                {item.rankedVideos.length} videos
              </Badge>
              <Badge variant="outline">{item.status}</Badge>
              <Link
                href={`/app/kb/${item.kbId}`}
                className="ml-auto text-label text-primary underline-offset-2 hover:underline"
              >
                Open
              </Link>
            </div>
            <CollapsibleContent className="pt-4">
              <KbResearchSourcesSection
                topic={item.topic}
                videos={item.rankedVideos}
                kbId={item.kbId}
                kbStatus={item.status}
                transcriptMode={item.transcriptMode}
              />
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
