"use client";

import { useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  /** Renders the closed state. Call `open()` to show the confirmation modal. */
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
 * Destructive confirmation as a centered modal. Focus moves to Cancel; Esc cancels.
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

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError("");
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

  return (
    <>
      {trigger ? (
        <div ref={triggerWrapRef} className={className}>
          {trigger(() => setOpen(true))}
        </div>
      ) : null}
      <Dialog
        open={open}
        disablePointerDismissal={busy}
        onOpenChange={(next) => {
          if (busy && !next) return;
          setOpen(next);
          if (!next) setError("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          initialFocus={cancelRef}
          role="alertdialog"
          className={trigger ? undefined : className}
        >
          <DialogHeader className="flex-row items-start gap-3">
            <WarningCircle weight="fill" className="text-destructive" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}
            </div>
          </DialogHeader>
          <DialogFooter>
            <ButtonGroup>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirm}
                disabled={busy}
                aria-busy={busy}
              >
                {busy && <Spinner data-icon="inline-start" />}
                {busy ? busyLabel : confirmLabel}
              </Button>
              <Button
                ref={cancelRef}
                variant="ghost"
                size="sm"
                onClick={close}
                disabled={busy}
              >
                {cancelLabel}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
