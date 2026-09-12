"use client";

import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

/** Height animation via CSS grid — items inside slide in/out smoothly. */
export default function AnimatedCollapse({
  open,
  children,
  className,
  innerClassName,
}: Props) {
  return (
    <div className={cn("app-collapse", open && "app-collapse-open", className)}>
      <div className={cn("app-collapse-inner", innerClassName)}>{children}</div>
    </div>
  );
}
