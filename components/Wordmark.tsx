import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-sm tracking-tight",
  md: "text-lg tracking-tight",
  lg: "text-[42px] leading-none tracking-[-0.84px]",
};

export default function Wordmark({ size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-mono font-semibold text-text [font-variant-ligatures:none]",
        sizeClasses[size],
        className
      )}
    >
      <span className="text-accent">[</span>
      {BRAND_NAME}
      <span className="text-accent">]</span>
    </span>
  );
}
