import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/** Full-height frame for marketing and auth routes. Theme control lives in `SiteNav`. */
export default function PageShell({ children, className }: Props) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-background", className)}>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
