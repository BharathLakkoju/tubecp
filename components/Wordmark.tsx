import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-body-sm tracking-tight",
  md: "text-title tracking-tight",
  lg: "text-display leading-none",
};

/** `[tubecp]` wordmark: Geist Mono with primary-colored brackets (design system §2.2, §4.1). */
export default function Wordmark({ size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-mono font-semibold text-foreground [font-variant-ligatures:none]",
        sizeClasses[size],
        className
      )}
    >
      <span className="text-primary">[</span>
      {BRAND_NAME}
      <span className="text-primary">]</span>
    </span>
  );
}
