"use client";

import { useId, useRef, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  topic: string;
  busy: boolean;
  onSend: (message: string) => void;
  /** Mono quota text, e.g. "12 / 200 chat messages". */
  quotaText?: string;
  /** Shown instead of the quota when sending is blocked. */
  disabledReason?: string;
}

/**
 * Chat composer (design system §6.12): InputGroup + textarea. Enter sends, Shift+Enter adds a newline.
 */
export default function ChatComposer({ topic, busy, onSend, quotaText, disabledReason }: Props) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  const send = () => {
    const message = value.trim();
    if (!message || busy || disabledReason) return;
    onSend(message);
    setValue("");
    ref.current?.focus();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <FieldLabel htmlFor={id} className="sr-only">
        Ask about {topic}
      </FieldLabel>
      <InputGroup className="rounded-xl shadow-1">
        <InputGroupTextarea
          ref={ref}
          id={id}
          value={value}
          rows={1}
          placeholder={`Ask about "${topic}"`}
          readOnly={busy}
          className="max-h-40 min-h-12 text-body"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupText className="font-mono text-caption tabular-nums">
            {disabledReason ?? quotaText ?? "Enter to send, Shift+Enter for a new line"}
          </InputGroupText>
          <InputGroupButton
            type="submit"
            variant="default"
            size="sm"
            className="ml-auto h-8 px-3 text-label"
            disabled={Boolean(disabledReason)}
            aria-busy={busy}
          >
            {busy ? <Spinner data-icon="inline-start" /> : <PaperPlaneRight data-icon="inline-start" aria-hidden />}
            Send
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
