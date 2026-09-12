/** Split inline table rows that were emitted on one line into separate lines. */
export function normalizeMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (!line.includes("|")) return line;

      const rows = line.match(/\|(?:[^|\n]+\|)+/g);
      if (rows && rows.length > 1) {
        return rows.join("\n");
      }

      return line;
    })
    .join("\n");
}

/** Advance reveal index by the next word (or a few characters). */
export function nextRevealIndex(buffer: string, index: number): number {
  if (index >= buffer.length) return index;

  const rest = buffer.slice(index);
  const wordMatch = rest.match(/^(\s*\S+\s*)/);
  if (wordMatch) {
    return index + wordMatch[1].length;
  }

  return Math.min(buffer.length, index + 2);
}
