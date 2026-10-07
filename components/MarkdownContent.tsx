"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { normalizeMarkdown, sanitizeMarkdownHref } from "@/lib/markdown";

interface Props {
  content: string;
  className?: string;
}

/** Renders model output with the `prose-tubecp` typography (tokens only, see globals.css). */
export default function MarkdownContent({ content, className }: Props) {
  const normalized = normalizeMarkdown(content);

  return (
    <div className={cn("prose-tubecp text-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            const safeHref = sanitizeMarkdownHref(href);
            if (!safeHref) {
              return <span>{children}</span>;
            }
            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
