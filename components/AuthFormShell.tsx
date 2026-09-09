"use client";

import FadeIn from "@/components/FadeIn";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthFormShell({ title, subtitle, children }: Props) {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-[28rem] flex-col justify-center gap-8 max-md:w-full max-md:justify-start max-md:gap-6">
      <FadeIn>
        <header className="w-full border-b border-border pb-4 text-left">
          <h1 className="font-mono text-lg font-semibold text-text">{title}</h1>
          <p className="mt-2 font-mono text-[13px] leading-relaxed text-text-muted">{subtitle}</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.06}>
        <div className="clerk-wrap w-full">{children}</div>
      </FadeIn>
    </div>
  );
}
