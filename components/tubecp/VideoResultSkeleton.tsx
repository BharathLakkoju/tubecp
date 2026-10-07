import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  rank?: number;
  className?: string;
}

/** Video result row placeholder (design system §6.10): 120×68 thumb, two lines, meter stub. */
export default function VideoResultSkeleton({ rank, className }: Props) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-4 px-4 py-3 max-sm:flex-col max-sm:items-stretch",
        className
      )}
    >
      {rank !== undefined && (
        <span
          aria-hidden="true"
          className="w-6 shrink-0 font-mono text-label tabular-nums text-muted-foreground max-sm:hidden"
        >
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <Skeleton
        className="h-[68px] w-[120px] max-w-full shrink-0 rounded-md max-sm:aspect-video max-sm:h-auto max-sm:w-full"
      />
      <div className="flex min-w-0 w-full flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-3 w-2/3 max-w-xs" />
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex" aria-hidden="true">
        <Skeleton className="h-3 w-6 rounded-xs" />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-3 w-1.5 rounded-xs" />
          ))}
        </div>
      </div>
    </div>
  );
}
