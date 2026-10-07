"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotsThree, DownloadSimple, Info, Trash } from "@phosphor-icons/react";
import type { KnowledgeBase, ChatMessage } from "@/lib/types";
import type { KbChatStreamState } from "@/lib/hooks/useKbChatStream";
import { deleteKnowledgeBase } from "@/lib/client/knowledge-base";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import { useSubscription } from "@/lib/hooks/useSubscription";
import CopyButton from "@/components/CopyButton";
import MarkdownContent from "@/components/MarkdownContent";
import AppPage from "@/components/tubecp/AppPage";
import ChatComposer from "@/components/tubecp/ChatComposer";
import InlineConfirm from "@/components/tubecp/InlineConfirm";
import SourceList from "@/components/tubecp/SourceList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  topic: string;
  kb: KnowledgeBase;
  messages: ChatMessage[];
  stream?: KbChatStreamState | null;
  notice?: string | null;
  onSend: (message: string) => void;
}

/**
 * Chat surface (design system 8.5): glass header with stats and a menu, a readable message
 * column, evidence under every answer, and a sticky composer. The page scrolls (no inner scroller).
 */
export default function ChatPanel({ topic, kb, messages, stream, notice, onSend }: Props) {
  const router = useRouter();
  const sub = useSubscription();
  const { removeKnowledgeBase } = useKnowledgeBases();
  const endRef = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isBusy = Boolean(stream);
  const showStreamStatus = stream && !stream.content;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, stream?.content, stream?.status]);

  const handleDelete = async () => {
    await deleteKnowledgeBase(kb.kbId);
    removeKnowledgeBase(kb.kbId);
    router.push("/app");
  };

  const chatLimitReached = !sub.loading && sub.chatLimit > 0 && sub.chatUsed >= sub.chatLimit;

  const header = (
    <div className="flex min-w-0 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-title-sm text-foreground">{kb.topic}</h1>
        <p className="truncate font-mono text-caption tabular-nums text-muted-foreground">
          {kb.videosIndexed} videos · {kb.chunksIndexed} chunks · ~{Math.round(kb.totalMinutes)} min
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Options for ${kb.topic}`} />
          }
        >
          <DotsThree weight="bold" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem render={<a href={`/api/knowledge-base/${kb.kbId}/export`} download />}>
            <DownloadSimple aria-hidden />
            Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
            <Trash aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <AppPage width="reading" header={header} className="gap-6 pt-6 pb-0">
      {confirmingDelete && (
        <InlineConfirm
          open
          onOpenChange={setConfirmingDelete}
          title={`Delete "${kb.topic}"?`}
          description="This removes its indexed videos and chat history. It can't be undone."
          onConfirm={handleDelete}
        />
      )}

      {notice && (
        <Alert variant="info">
          <Info weight="fill" aria-hidden />
          <AlertTitle>Some videos were skipped</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-1 flex-col gap-6">
        {messages.length === 0 && !stream && (
          <p className="text-body text-foreground-secondary">
            Ask anything about this knowledge base. Answers cite the video and the moment.
          </p>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <Message key={i} align="end" className="text-body">
              <MessageContent>
                <Bubble variant="tinted" align="end" className="max-w-[85%]">
                  <BubbleContent className="text-body whitespace-pre-wrap">
                    {msg.content}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ) : (
            <Message key={i} className="text-body">
              <MessageContent>
                <Bubble variant="ghost">
                  <BubbleContent className="text-body">
                    <MarkdownContent content={msg.content} />
                  </BubbleContent>
                </Bubble>

                {msg.sources && msg.sources.length > 0 && (
                  <SourceList sources={msg.sources} defaultOpen={i === lastAssistantIndex} />
                )}

                {msg.gaps && (
                  <Alert variant="info">
                    <Info weight="fill" aria-hidden />
                    <AlertTitle>Not covered by these videos</AlertTitle>
                    <AlertDescription>{msg.gaps}</AlertDescription>
                  </Alert>
                )}

                <MessageFooter className="px-0">
                  <CopyButton variant="icon" text={msg.content} label="Copy response" />
                </MessageFooter>
              </MessageContent>
            </Message>
          )
        )}

        {stream && (
          <Message className="text-body">
            <MessageContent>
              {showStreamStatus ? (
                <Marker aria-live="off" className="text-body-sm">
                  <MarkerIcon>
                    <Spinner />
                  </MarkerIcon>
                  <MarkerContent className="shimmer">{stream.status}</MarkerContent>
                </Marker>
              ) : (
                <Bubble variant="ghost">
                  <BubbleContent className="text-body">
                    <MarkdownContent content={stream.content} />
                    {stream.isRevealing && (
                      <span
                        aria-hidden
                        className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-primary motion-safe:animate-pulse"
                      />
                    )}
                  </BubbleContent>
                </Bubble>
              )}
            </MessageContent>
          </Message>
        )}

        <div ref={endRef} className="scroll-mb-48" />
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 bg-linear-to-t from-background from-70% to-transparent px-4 pt-6 pb-4 sm:-mx-6 sm:px-6">
        <ChatComposer
          topic={topic}
          busy={isBusy}
          onSend={onSend}
          quotaText={
            sub.loading || sub.chatLimit <= 0
              ? undefined
              : `${sub.chatUsed} / ${sub.chatLimit} chat messages this month`
          }
          disabledReason={
            chatLimitReached ? "Monthly chat limit reached. Upgrade for more messages." : undefined
          }
        />
        <p className="mt-2 text-center text-caption text-muted-foreground">
          Answers can be wrong. Check the cited moments before relying on them.
        </p>
      </div>
    </AppPage>
  );
}
