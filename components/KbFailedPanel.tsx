"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeBase } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function KbFailedPanel({ kb }: { kb: KnowledgeBase }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);

    try {
      const res = await fetch(`/api/knowledge-base/${kb.kbId}/retry`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to retry knowledge base build");
        return;
      }

      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        const statusRes = await fetch(`/api/knowledge-base/${kb.kbId}/build-status`);
        const status = await statusRes.json();
        if (!statusRes.ok) {
          setError(status.error ?? "Failed to check build status");
          return;
        }
        if (status.status === "ready") {
          router.refresh();
          return;
        }
        if (status.status === "failed") {
          setError(status.error ?? "Build failed again. Try different videos.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setError("Build is still running. Refresh this page in a moment.");
    } catch {
      setError("Failed to retry knowledge base build");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="app-panel">
      <div className="app-panel-scroll">
        <div className="max-w-xl border border-border bg-surface p-6">
          <h2 className="font-mono text-base font-semibold text-text">
            Knowledge base build failed
          </h2>
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-text-muted">
            We could not index any transcript content for <strong>{kb.topic}</strong>. This
            usually means every selected video was missing captions or failed to process.
          </p>
          {error && (
            <p className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[13px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Retrying build...
                </span>
              ) : (
                "Retry build"
              )}
            </button>
            <a href="/app" className="btn-ghost">
              Back to research
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
