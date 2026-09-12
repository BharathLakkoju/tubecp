"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { deleteKnowledgeBase } from "@/lib/client/knowledge-base";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import KbDeleteConfirmDialog from "@/components/KbDeleteConfirmDialog";
import { cn } from "@/lib/cn";

interface Props {
  kbId: string;
  topic: string;
  redirectOnDelete?: boolean;
  className?: string;
}

export default function KbDeleteButton({
  kbId,
  topic,
  redirectOnDelete = false,
  className,
}: Props) {
  const router = useRouter();
  const { removeKnowledgeBase } = useKnowledgeBases();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      await deleteKnowledgeBase(kbId);
      removeKnowledgeBase(kbId);
      setConfirming(false);

      if (redirectOnDelete) {
        router.push("/app");
      }
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cn("chat-panel-delete", className)}
        aria-label={`Delete knowledge base ${topic}`}
        title="Delete knowledge base"
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
      >
        <Trash size={16} weight="regular" />
      </button>

      <KbDeleteConfirmDialog
        open={confirming}
        topic={topic}
        deleting={deleting}
        error={error}
        onConfirm={handleDelete}
        onCancel={() => {
          if (deleting) return;
          setConfirming(false);
          setError("");
        }}
      />
    </>
  );
}
