import { cn } from "@/lib/cn";

interface Props {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizePx = {
  sm: 16,
  md: 20,
  lg: 28,
} as const;

export default function LoadingSpinner({ size = "md", label, className }: Props) {
  const px = sizePx[size];

  return (
    <div className={cn("loading-spinner-wrap", className)} role="status" aria-live="polite">
      <svg
        className="loading-spinner-svg"
        width={px}
        height={px}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="loading-spinner-track"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2.5"
        />
        <circle
          className="loading-spinner-arc"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="16 47"
        />
      </svg>
      {label && <span className="loading-spinner-label">{label}</span>}
    </div>
  );
}
