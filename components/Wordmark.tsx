import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6",
  md: "h-7",
  lg: "h-[52px] max-sm:h-10",
};

/** tubecp v3 lockup (citation bracket mark + Geist wordmark). */
export default function Wordmark({ size = "md", className }: Props) {
  return (
    <span
      className={cn("brand-lockup inline-flex shrink-0 items-center", sizeClasses[size], className)}
      role="img"
      aria-label={BRAND_NAME}
    >
      <img
        src="/brand/logo-full-light.svg"
        alt=""
        className="brand-lockup-light h-full w-auto"
        width={416}
        height={103}
        decoding="async"
      />
      <img
        src="/brand/logo-full-dark.svg"
        alt=""
        className="brand-lockup-dark h-full w-auto"
        width={416}
        height={103}
        decoding="async"
      />
    </span>
  );
}
