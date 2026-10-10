"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SavedResearch } from "@/lib/types";

interface ResearchesContextValue {
  researches: SavedResearch[];
  loading: boolean;
  error: string;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

const ResearchesContext = createContext<ResearchesContextValue | null>(null);

export function ResearchesProvider({
  initialResearches,
  canLoad,
  children,
}: {
  initialResearches: SavedResearch[];
  canLoad: boolean;
  children: ReactNode;
}) {
  const [researches, setResearches] = useState(initialResearches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!canLoad) {
      setResearches([]);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch("/api/researches");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load researches");
      setResearches(data.researches ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [canLoad]);

  const value = useMemo(
    () => ({ researches, loading, error, refresh }),
    [researches, loading, error, refresh]
  );

  return <ResearchesContext.Provider value={value}>{children}</ResearchesContext.Provider>;
}

export function useResearchesContext(): ResearchesContextValue {
  const context = useContext(ResearchesContext);
  if (!context) {
    throw new Error("useResearches must be used within ResearchesProvider");
  }
  return context;
}
