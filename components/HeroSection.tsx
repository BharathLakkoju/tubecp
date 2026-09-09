import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  subtitle?: string;
  showWordmark?: boolean;
  align?: "left" | "center";
  children?: React.ReactNode;
}

export default function HeroSection({
  title,
  subtitle,
  showWordmark = false,
  align = "left",
  children,
}: Props) {
  const centered = align === "center";

  return (
    <section className={cn("pb-10 max-sm:pb-8", centered && "text-center")}>
      {showWordmark && (
        <div className={cn("mb-2.5", centered && "mx-auto")}>
          <Wordmark size="lg" />
        </div>
      )}
      {showWordmark && (
        <p
          className={cn(
            "max-w-xl font-sans text-sm leading-relaxed text-text-muted max-sm:text-[13px]",
            centered && "mx-auto"
          )}
        >
          {BRAND_TAGLINE}
        </p>
      )}
      {showWordmark && <hr className="divider my-6" />}
      <h1
        className={cn(
          "max-w-xl font-mono text-lg font-semibold leading-snug text-text sm:text-xl",
          centered && "mx-auto"
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-2.5 max-w-xl font-mono text-[13px] leading-relaxed text-text-muted",
            centered && "mx-auto"
          )}
        >
          {subtitle}
        </p>
      )}
      {children && <div className={cn("mt-6 w-full", centered && "mx-auto")}>{children}</div>}
    </section>
  );
}
