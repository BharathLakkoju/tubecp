import { Badge } from "@/components/ui/badge";
import { getPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The plan name comes only from `getPlan(id).name` (design system §6.6, §9.2).
 * Free is outline; paid plans use the primary-subtle tint.
 */
export default function PlanBadge({
  planId,
  className,
}: {
  planId: string | undefined;
  className?: string;
}) {
  const plan = getPlan(planId);

  return (
    <Badge
      variant={plan.id === "free" ? "outline" : "default"}
      className={cn(
        plan.id !== "free" && "bg-primary-subtle text-primary-subtle-foreground",
        className
      )}
    >
      {plan.name}
    </Badge>
  );
}
