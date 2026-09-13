"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface Props {
  text: string;
  label?: string;
  className?: string;
  variant?: "default" | "icon";
  disabled?: boolean;
}

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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={copy}
        disabled={disabled || !text}
        className={cn("copy-btn-icon", className)}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
      >
        {copied ? <Check size={14} weight="bold" aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled || !text}
      className={cn("app-copy-links-btn", className)}
    >
      {copied ? (
        <>
          <Check size={14} weight="bold" aria-hidden />
          Copied
        </>
      ) : (
        <>
          <Copy size={14} weight="regular" aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
