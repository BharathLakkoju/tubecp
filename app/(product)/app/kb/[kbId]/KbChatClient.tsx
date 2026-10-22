"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, KbBuildOptions, KnowledgeBase, RankedVideo } from "@/lib/types";
import KbResearchSourcesSheet, {
  type KbResearchSourcesSheetFocus,
} from "@/components/KbResearchSourcesSheet";
import type { SkippedKbVideo } from "@/lib/client/workflows";
import { mergeSkippedKbVideos } from "@/lib/client/kb-skipped-videos";
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
  const [skippedVideos, setSkippedVideos] = useState<SkippedKbVideo[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesFocus, setSourcesFocus] = useState<KbResearchSourcesSheetFocus>("sources");
  const { stream, sendMessage, isStreaming } = useKbChatStream();

  useEffect(() => {
    let sessionSkipped: SkippedKbVideo[] = [];
    const raw = sessionStorage.getItem(`kb-build-notice:${kb.kbId}`);
    if (raw) {
      sessionStorage.removeItem(`kb-build-notice:${kb.kbId}`);
      try {
        sessionSkipped = JSON.parse(raw) as SkippedKbVideo[];
      } catch {
        sessionSkipped = [];
      }
    }
    setSkippedVideos(mergeSkippedKbVideos(kb, sourceVideos, sessionSkipped));
  }, [kb, sourceVideos]);

  const openResearchSources = useCallback((focus: KbResearchSourcesSheetFocus = "sources") => {
    setSourcesFocus(focus);
    setSourcesOpen(true);
  }, []);

  useEffect(() => {
    if (!sourcesOpen) return;
    const id = sourcesFocus === "skipped" ? "kb-skipped-videos" : "kb-research-videos";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
  }, [sourcesOpen, sourcesFocus]);

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

  const skippedNotice =
    skippedVideos.length > 0
      ? `${skippedVideos.length} video${skippedVideos.length === 1 ? "" : "s"} could not be indexed and were skipped.`
      : null;

  return (
    <>
      {sourceVideos.length > 0 && (
        <KbResearchSourcesSheet
          open={sourcesOpen}
          onOpenChange={setSourcesOpen}
          focus={sourcesFocus}
          kb={kb}
          sourceVideos={sourceVideos}
          indexedVideoIds={indexedVideoIds}
          skippedVideos={skippedVideos}
          buildOptions={buildOptions}
        />
      )}
      <ChatPanel
        topic={kb.topic}
        kb={kb}
        messages={messages}
        stream={stream}
        notice={skippedNotice}
        onViewSkipped={
          skippedVideos.length > 0 ? () => openResearchSources("skipped") : undefined
        }
        researchVideoCount={sourceVideos.length}
        onOpenResearchSources={
          sourceVideos.length > 0 ? () => openResearchSources("sources") : undefined
        }
        onSend={handleChat}
      />
    </>
  );
}
