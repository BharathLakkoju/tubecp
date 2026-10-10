"use client";

import { useResearchesContext } from "@/lib/contexts/ResearchesContext";

export function useResearches() {
  return useResearchesContext();
}
