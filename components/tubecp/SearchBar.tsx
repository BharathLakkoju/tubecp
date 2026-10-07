"use client";

import { useId, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  onSearch: (topic: string) => void;
  loading: boolean;
  /** Mono caption under the field, e.g. "3 / 10 researches today". */
  quotaText?: string;
  /** When set, the button is disabled and this explains why (design system §3.3, §6.2). */
  disabledReason?: string;
  suggestions?: string[];
}

/**
 * Search bar (design system §6.2). The Research button is never disabled for an empty query:
 * submitting an empty field focuses it and shows "Enter a topic to research."
 */
export default function SearchBar({
  onSearch,
  loading,
  quotaText,
  disabledReason,
  suggestions = [],
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const describedBy = error ? `${id}-error` : quotaText || disabledReason ? `${id}-desc` : undefined;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (loading || disabledReason) return;
    if (!trimmed) {
      setError("Enter a topic to research.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    onSearch(trimmed);
  };

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(topic);
      }}
      noValidate
    >
      <Field data-invalid={Boolean(error) || undefined}>
        <FieldLabel className="sr-only" htmlFor={id}>
          Research topic
        </FieldLabel>
        <InputGroup className="h-13 rounded-lg shadow-1">
          <InputGroupInput
            ref={inputRef}
            id={id}
            value={topic}
            readOnly={loading}
            autoFocus
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            placeholder="Search a topic, e.g. sourdough for beginners"
            className="h-full text-body"
            onChange={(event) => {
              setTopic(event.target.value);
              if (error) setError("");
            }}
          />
          <InputGroupAddon>
            <MagnifyingGlass aria-hidden />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            {!topic && !loading && <Kbd aria-hidden>/</Kbd>}
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              disabled={Boolean(disabledReason)}
              aria-busy={loading}
              className="h-9 px-4 text-body-sm"
            >
              {loading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Researching
                </>
              ) : (
                "Research"
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {(quotaText || disabledReason) && !error && (
          <FieldDescription id={`${id}-desc`} className="font-mono tabular-nums">
            {disabledReason ?? quotaText}
          </FieldDescription>
        )}
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      </Field>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Suggested topics">
          <span className="text-caption text-muted-foreground">Try</span>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={loading || Boolean(disabledReason)}
              onClick={() => {
                setTopic(suggestion);
                submit(suggestion);
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </form>
  );
}
