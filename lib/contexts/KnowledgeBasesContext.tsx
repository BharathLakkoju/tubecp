"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KnowledgeBase } from "@/lib/types";

interface KnowledgeBasesContextValue {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  removeKnowledgeBase: (kbId: string) => void;
}

const KnowledgeBasesContext = createContext<KnowledgeBasesContextValue | null>(null);

export function KnowledgeBasesProvider({
  initialKnowledgeBases,
  canLoad,
  children,
}: {
  initialKnowledgeBases: KnowledgeBase[];
  canLoad: boolean;
  children: ReactNode;
}) {
  const [knowledgeBases, setKnowledgeBases] = useState(initialKnowledgeBases);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const removeKnowledgeBase = useCallback((kbId: string) => {
    setKnowledgeBases((current) => current.filter((kb) => kb.kbId !== kbId));
  }, []);

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setKnowledgeBases([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/knowledge-base");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load knowledge bases");
      setKnowledgeBases(data.knowledgeBases ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [canLoad]);

  const value = useMemo(
    () => ({ knowledgeBases, loading, error, refresh, removeKnowledgeBase }),
    [knowledgeBases, loading, error, refresh, removeKnowledgeBase]
  );

  return (
    <KnowledgeBasesContext.Provider value={value}>{children}</KnowledgeBasesContext.Provider>
  );
}

export function useKnowledgeBasesContext(): KnowledgeBasesContextValue {
  const context = useContext(KnowledgeBasesContext);
  if (!context) {
    throw new Error("useKnowledgeBases must be used within KnowledgeBasesProvider");
  }
  return context;
}
