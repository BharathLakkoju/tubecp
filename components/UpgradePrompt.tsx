"use client";

import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  plan?: "pro" | "researcher";
  className?: string;
}

/** Plan gate (design system §6.9 "Free plan gate"). Plan names come from `getPlan`. */
export default function UpgradePrompt({ title, description, plan = "pro", className }: Props) {
  const planName = getPlan(plan).name;

  return (
    <Empty className={cn("border", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockSimple aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        <Link href={`/api/checkout?plan=${plan}`} className={buttonVariants()}>
          Upgrade to {planName}
        </Link>
        <Link href="/pricing" className={buttonVariants({ variant: "link" })}>
          Compare plans
        </Link>
      </EmptyContent>
    </Empty>
  );
}
