"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, KbBuildOptions, KnowledgeBase, RankedVideo } from "@/lib/types";
import KbResearchSourcesSection from "@/components/KbResearchSourcesSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CaretRight } from "@phosphor-icons/react";
import type { SkippedKbVideo } from "@/lib/client/workflows";
import { useKbChatStream } from "@/lib/hooks/useKbChatStream";
import ChatPanel from "@/components/ChatPanel";

export default function KbChatClient({
  kb,
  initialMessages,
  sourceVideos = [],
  indexedVideoIds = [],
  buildOptions,
}: {
  kb: KnowledgeBase;
  initialMessages: ChatMessage[];
  sourceVideos?: RankedVideo[];
  indexedVideoIds?: string[];
  buildOptions?: KbBuildOptions;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [buildNotice, setBuildNotice] = useState<string | null>(null);
  const { stream, sendMessage, isStreaming } = useKbChatStream();

  useEffect(() => {
    const raw = sessionStorage.getItem(`kb-build-notice:${kb.kbId}`);
    if (!raw) return;

    sessionStorage.removeItem(`kb-build-notice:${kb.kbId}`);

    try {
      const skipped = JSON.parse(raw) as SkippedKbVideo[];
      if (!skipped.length) return;

      const lines = skipped.map((item) => item.reason).join(" ");
      setBuildNotice(
        `${skipped.length} video${skipped.length === 1 ? "" : "s"} could not be indexed and were skipped. ${lines}`,
      );
    } catch {
      // ignore malformed notice payload
    }
  }, [kb.kbId]);

  const handleChat = useCallback(
    (message: string) => {
      if (isStreaming) return;

      sendMessage(
        kb.kbId,
        message,
        (userMsg) => setMessages((prev) => [...prev, userMsg]),
        (assistantMsg) => setMessages((prev) => [...prev, assistantMsg])
      );
    },
    [isStreaming, kb.kbId, sendMessage]
  );

  const sourcesBlock =
    sourceVideos.length > 0 ? (
      <Collapsible className="border-b border-border pb-6">
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit text-foreground-secondary data-panel-open:[&>svg]:rotate-90"
            />
          }
        >
          <CaretRight className="transition-transform duration-(--duration-base)" aria-hidden />
          Research videos ({sourceVideos.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <KbResearchSourcesSection
            topic={kb.topic}
            videos={sourceVideos}
            kbId={kb.kbId}
            kbStatus={kb.status}
            indexedVideoIds={indexedVideoIds}
            transcriptMode={buildOptions?.transcriptMode ?? kb.buildOptions?.transcriptMode}
          />
        </CollapsibleContent>
      </Collapsible>
    ) : null;

  return (
    <div className="flex flex-col">
      {sourcesBlock && <div className="mx-auto w-full max-w-[var(--page-reading)] px-6 pt-6">{sourcesBlock}</div>}
      <ChatPanel
        topic={kb.topic}
        kb={kb}
        messages={messages}
        stream={stream}
        notice={buildNotice}
        onSend={handleChat}
      />
    </div>
  );
}
