"use client";

import { useEffect, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Props {
  /** Renders the closed state. Call `open()` to swap to the confirmation in place. */
  trigger?: (open: () => void) => React.ReactNode;
  /** Controlled mode (e.g. opened from a dropdown item). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  className?: string;
}

/**
 * Confirms without a modal (design system §6.13, repo rule `no-modals`).
 * The trigger swaps in place to an Alert; focus moves to Cancel; Esc cancels.
 */
export default function InlineConfirm({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  busyLabel = "Deleting...",
  cancelLabel = "Cancel",
  onConfirm,
  className,
}: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (value: boolean) => {
    setOpenState(value);
    onOpenChange?.(value);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError("");
    // Return focus to the trigger once it is re-rendered.
    requestAnimationFrame(() => {
      triggerWrapRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err).replace(/^Error: /, ""));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    if (!trigger) return null;
    return (
      <div ref={triggerWrapRef} className={className}>
        {trigger(() => setOpen(true))}
      </div>
    );
  }

  return (
    <Alert
      variant="destructive"
      className={cn(className)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <WarningCircle weight="fill" aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {error && (
        <AlertDescription className="font-medium text-destructive">{error}</AlertDescription>
      )}
      <AlertAction>
        <ButtonGroup>
          <Button variant="destructive" size="sm" onClick={confirm} disabled={busy} aria-busy={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            {busy ? busyLabel : confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="ghost" size="sm" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
        </ButtonGroup>
      </AlertAction>
    </Alert>
  );
}
