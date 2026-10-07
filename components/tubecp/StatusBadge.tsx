import {
  CheckCircle,
  Clock,
  Info,
  Pause,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type JobStatusKind =
  | "queued"
  | "running"
  | "stalled"
  | "warning"
  | "failed"
  | "done"
  | "info";

const DEFAULT_LABEL: Record<JobStatusKind, string> = {
  queued: "Queued",
  running: "Running",
  stalled: "Stalled",
  warning: "Warning",
  failed: "Failed",
  done: "Ready",
  info: "Info",
};

const STYLE: Record<JobStatusKind, string> = {
  queued: "",
  running: "bg-primary-subtle text-primary-subtle-foreground",
  stalled: "bg-warning-subtle text-warning",
  warning: "bg-warning-subtle text-warning",
  failed: "bg-destructive-subtle text-destructive",
  done: "bg-success-subtle text-success",
  info: "bg-info-subtle text-info",
};

/**
 * Status is never conveyed by color alone: every state has an icon and a word (design system §3.1, §6.6).
 */
export default function StatusBadge({
  status,
  children,
  className,
}: {
  status: JobStatusKind;
  children?: React.ReactNode;
  className?: string;
}) {
  const icon = (() => {
    switch (status) {
      case "queued":
        return <Clock data-icon="inline-start" weight="regular" aria-hidden />;
      case "running":
        return <Spinner data-icon="inline-start" aria-hidden role="presentation" />;
      case "stalled":
        return <Pause data-icon="inline-start" weight="fill" aria-hidden />;
      case "warning":
        return <Warning data-icon="inline-start" weight="fill" aria-hidden />;
      case "failed":
        return <XCircle data-icon="inline-start" weight="fill" aria-hidden />;
      case "done":
        return <CheckCircle data-icon="inline-start" weight="fill" aria-hidden />;
      case "info":
        return <Info data-icon="inline-start" weight="fill" aria-hidden />;
    }
  })();

  return (
    <Badge
      variant={status === "queued" ? "secondary" : "default"}
      className={cn(STYLE[status], className)}
    >
      {icon}
      {children ?? DEFAULT_LABEL[status]}
    </Badge>
  );
}
