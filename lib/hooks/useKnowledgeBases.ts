"use client";

import { useEffect, useState } from "react";
import type { KnowledgeBase } from "@/lib/types";
import { useSubscription } from "@/lib/hooks/useSubscription";

export function useKnowledgeBases() {
  const sub = useSubscription();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sub.canBuildKb) {
      setKnowledgeBases([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setKnowledgeBases(data.knowledgeBases ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sub.canBuildKb]);

  return { knowledgeBases, loading, error };
}
