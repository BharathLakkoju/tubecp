import Reveal from "@/components/motion/Reveal";
import HeroText from "@/components/motion/HeroText";
import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  showWordmark?: boolean;
  align?: "left" | "center";
  /** Word-by-word reveal (M3). Use on the landing hero only; other pages use a plain fade (M1). */
  animateTitle?: boolean;
  children?: React.ReactNode;
}

/** Marketing page header. Calm by default; the landing page opts in to the hero text reveal. */
export default function HeroSection({
  title,
  subtitle,
  showWordmark = false,
  align = "left",
  animateTitle = false,
  children,
}: Props) {
  const centered = align === "center";

  return (
    <section
      className={cn(
        "flex flex-col gap-5 pt-12 pb-10 sm:pt-16 sm:pb-12",
        centered && "items-center text-center"
      )}
    >
      {showWordmark && (
        <div className="flex flex-col gap-2">
          <Wordmark size="lg" />
          <p className="max-w-xl text-body-sm text-foreground-secondary">{BRAND_TAGLINE}</p>
        </div>
      )}

      {animateTitle ? (
        <HeroText
          text={title}
          as="h1"
          className={cn(
            "max-w-3xl text-display text-foreground",
            centered && "justify-center"
          )}
        />
      ) : (
        <Reveal as="h1" immediate className="max-w-3xl text-display text-foreground">
          {title}
        </Reveal>
      )}

      {subtitle && (
        <Reveal as="p" immediate delay={0.06} className="max-w-2xl text-body text-foreground-secondary">
          {subtitle}
        </Reveal>
      )}

      {children && (
        <Reveal immediate delay={0.12} className={cn("w-full", centered && "flex justify-center")}>
          {children}
        </Reveal>
      )}
    </section>
  );
}
