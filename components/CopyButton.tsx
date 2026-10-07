"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface Props {
  text: string;
  label?: string;
  className?: string;
  variant?: "default" | "icon";
  disabled?: boolean;
}

/**
 * Copy to clipboard. Feedback is both inline (icon + label swap) and a toast, since a copy is a
 * user action (design system §6.8). Icon-only buttons carry an aria-label.
 */
export default function CopyButton({
  text,
  label = "Copy",
  className,
  variant = "default",
  disabled = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text || disabled) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.add({ title: "Copied to clipboard", type: "success", timeout: 2000 });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast.add({
        title: "Could not copy",
        description: "Your browser blocked clipboard access. Select the text and copy it manually.",
        type: "error",
      });
    }
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        disabled={disabled || !text}
        className={className}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
      >
        {copied ? <Check weight="bold" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      disabled={disabled || !text}
      className={className}
    >
      {copied ? (
        <>
          <Check data-icon="inline-start" weight="bold" aria-hidden />
          Copied
        </>
      ) : (
        <>
          <Copy data-icon="inline-start" weight="regular" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}
