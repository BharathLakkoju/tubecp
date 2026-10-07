"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlan } from "@/lib/plans";
import type { ResearchResult } from "@/lib/types";
import type { ResearchPreview } from "@/lib/services/research-preview";

export default function FreeTierTeaser({ research }: { research: ResearchResult }) {
  const [preview, setPreview] = useState<ResearchPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const proName = getPlan("pro").name;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/research/preview-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: research.topic,
        rankedVideos: research.rankedVideos.slice(0, 5),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPreview(data.preview ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [research.topic, research.rankedVideos]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        <span className="sr-only">Loading preview</span>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Preview chat
          </Badge>
          <CardTitle className="pt-2">{preview.sampleQuestion}</CardTitle>
          <CardDescription>
            Source: {preview.sourceVideo.title} · {preview.sourceVideo.channel}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-body-sm text-foreground-secondary">{preview.teaserAnswer}</p>
          <Link href="/api/checkout?plan=pro" className={buttonVariants({ size: "sm" })}>
            Unlock full chat
          </Link>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted shadow-none">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Knowledge base preview
          </Badge>
          <CardTitle className="pt-2 font-mono tabular-nums">
            {preview.kbTeaser.videoCount} videos · ~{preview.kbTeaser.estimatedChunks} chunks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {preview.kbTeaser.sampleTopics.map((title) => (
              <li key={title} className="text-body-sm text-foreground-secondary blur-[2px] select-none">
                {title}
              </li>
            ))}
          </ul>
          <p className="text-body-sm text-foreground-secondary">
            {proName} transcribes every ranked video into a searchable, cited knowledge base.
          </p>
          <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Compare plans
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
