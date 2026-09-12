"use client";

import { useKnowledgeBasesContext } from "@/lib/contexts/KnowledgeBasesContext";

export function useKnowledgeBases() {
  return useKnowledgeBasesContext();
}
