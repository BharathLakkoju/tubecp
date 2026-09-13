"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThree, Trash } from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/types";
import { deleteKnowledgeBase } from "@/lib/client/knowledge-base";
import { useKnowledgeBases } from "@/lib/hooks/useKnowledgeBases";
import KbDeleteConfirmDialog from "@/components/KbDeleteConfirmDialog";
import { cn } from "@/lib/cn";

interface Props {
  kb: KnowledgeBase;
  active: boolean;
}

export default function KbSidebarItem({ kb, active }: Props) {
  const router = useRouter();
  const { removeKnowledgeBase } = useKnowledgeBases();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      await deleteKnowledgeBase(kb.kbId);
      removeKnowledgeBase(kb.kbId);
      setConfirming(false);
      if (active) router.push("/app");
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <li className={cn("app-sidebar-kb-item", menuOpen && "app-sidebar-kb-item-menu-open")}>
        <div className="app-sidebar-kb-row">
        <Link
          href={`/app/kb/${kb.kbId}`}
          prefetch={false}
          className={cn("app-sidebar-kb-link", active && "app-sidebar-kb-link-active")}
          title={kb.topic}
          onClick={closeMenu}
        >
            <span className="app-sidebar-kb-link-text">{kb.topic}</span>
          </Link>

          <button
            type="button"
            className="app-sidebar-kb-menu-trigger"
            aria-label={`Actions for ${kb.topic}`}
            aria-expanded={menuOpen}
            aria-controls={`kb-menu-${kb.kbId}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <DotsThree size={16} weight="bold" />
          </button>
        </div>

        {menuOpen && (
          <div className="app-sidebar-kb-inline-menu" id={`kb-menu-${kb.kbId}`} role="menu">
            <button
              type="button"
              role="menuitem"
              className="app-sidebar-kb-menu-item app-sidebar-kb-menu-item-danger"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                setConfirming(true);
              }}
            >
              <Trash size={14} weight="regular" aria-hidden />
              Delete knowledge base
            </button>
          </div>
        )}
      </li>

      <KbDeleteConfirmDialog
        open={confirming}
        topic={kb.topic}
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
