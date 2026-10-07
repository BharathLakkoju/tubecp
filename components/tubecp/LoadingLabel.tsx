import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Inline loading state: spinner + label (design system §6.1 loading rule). */
export default function LoadingLabel({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("inline-flex items-center gap-2 text-body-sm text-foreground-secondary", className)}
    >
      <Spinner aria-hidden role="presentation" />
      <span>{label}</span>
    </div>
  );
}
