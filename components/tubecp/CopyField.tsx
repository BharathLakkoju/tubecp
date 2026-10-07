"use client";

import CopyButton from "@/components/CopyButton";
import { cn } from "@/lib/utils";

/** Read-only mono value with a copy button. `multiline` keeps commands readable on narrow screens. */
export default function CopyField({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border bg-muted p-2 pl-3", className)}>
      <code className="min-w-0 flex-1 py-1.5 font-mono text-label break-all text-foreground">
        {value}
      </code>
      <CopyButton variant="icon" text={value} label={label} />
    </div>
  );
}
