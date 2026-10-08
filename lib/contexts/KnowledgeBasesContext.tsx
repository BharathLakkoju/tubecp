"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KnowledgeBase } from "@/lib/types";

interface KnowledgeBasesContextValue {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  error: string;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
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

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!canLoad) {
      setKnowledgeBases([]);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch("/api/knowledge-base");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load knowledge bases");
      setKnowledgeBases(data.knowledgeBases ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [canLoad]);

  const hasBuildingKb = knowledgeBases.some((kb) => kb.status === "building");

  useEffect(() => {
    if (!canLoad || !hasBuildingKb) return;

    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [canLoad, hasBuildingKb, refresh]);

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
