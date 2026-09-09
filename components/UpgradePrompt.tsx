"use client";

import Link from "next/link";

interface Props {
  title: string;
  description: string;
  plan?: "pro" | "researcher";
}

export default function UpgradePrompt({ title, description, plan = "pro" }: Props) {
  return (
    <div className="mt-8 border-t border-border pt-6 text-left">
      <h3 className="mb-2 font-mono text-sm font-semibold text-text">{title}</h3>
      <p className="mb-4 font-mono text-[13px] leading-relaxed text-text-muted">{description}</p>
      <div className="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
        <Link href={`/api/checkout?plan=${plan}`} className="btn-primary max-sm:w-full">
          upgrade to {plan === "researcher" ? "Researcher" : "Pro"} →
        </Link>
        <Link href="/pricing" className="font-mono text-xs text-text-muted no-underline hover:text-text">
          Compare plans
        </Link>
      </div>
    </div>
  );
}
