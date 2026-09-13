"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ResearchResult } from "@/lib/types";
import type { ResearchPreview } from "@/lib/services/research-preview";

export default function FreeTierTeaser({ research }: { research: ResearchResult }) {
  const [preview, setPreview] = useState<ResearchPreview | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="mt-8 border border-border bg-surface p-5">
        <p className="font-mono text-[13px] text-text-muted">Loading preview…</p>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <div className="border border-border bg-surface p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Preview chat</p>
        <p className="mt-3 font-mono text-sm font-semibold text-text">{preview.sampleQuestion}</p>
        <p className="mt-3 font-mono text-[13px] leading-relaxed text-text-muted">
          {preview.teaserAnswer}
        </p>
        <p className="mt-4 font-mono text-[11px] text-text-muted">
          Source: {preview.sourceVideo.title} · {preview.sourceVideo.channel}
        </p>
        <Link href="/api/checkout?plan=pro" className="btn-primary mt-4 inline-flex">
          unlock full chat →
        </Link>
      </div>

      <div className="border border-dashed border-border bg-bg p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Teaser KB</p>
        <p className="mt-3 font-mono text-sm font-semibold text-text">
          {preview.kbTeaser.videoCount} videos · ~{preview.kbTeaser.estimatedChunks} chunks
        </p>
        <ul className="mt-3 space-y-2">
          {preview.kbTeaser.sampleTopics.map((title) => (
            <li key={title} className="font-mono text-[12px] text-text-muted blur-[2px] select-none">
              {title}
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[12px] text-text-muted">
          Pro transcribes every ranked video into a searchable, cited knowledge base.
        </p>
        <Link href="/pricing" className="btn-ghost mt-4 inline-flex">
          compare plans
        </Link>
      </div>
    </div>
  );
}
