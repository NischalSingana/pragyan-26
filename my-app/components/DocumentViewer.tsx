"use client";

import type { EhrStructuredData } from "@/lib/ai/ehrTypes";

type Props = {
  extractedText: string;
  structuredData: EhrStructuredData | null;
};

/**
 * Highlights source snippets in the extracted text for explainability.
 */
export function DocumentViewer({ extractedText, structuredData }: Props) {
  if (!extractedText.trim()) {
    return (
      <p className="text-muted-foreground text-sm">No text extracted from this document.</p>
    );
  }

  const snippets = new Set<string>();
  if (structuredData) {
    for (const s of structuredData.symptoms) {
      if (s.sourceSnippet?.trim()) snippets.add(s.sourceSnippet.trim());
    }
    for (const c of structuredData.conditions) {
      if (c.sourceSnippet?.trim()) snippets.add(c.sourceSnippet.trim());
    }
    for (const m of structuredData.medications) {
      if (m.sourceSnippet?.trim()) snippets.add(m.sourceSnippet.trim());
    }
  }

  const parts: Array<{ text: string; highlight: boolean }> = [];
  let remaining = extractedText;
  const snippetList = Array.from(snippets).sort(
    (a, b) => b.length - a.length
  );

  while (remaining.length > 0) {
    let best: { index: number; length: number } | null = null;
    for (const snip of snippetList) {
      const index = remaining.toLowerCase().indexOf(snip.toLowerCase());
      if (index !== -1 && (best === null || index < best.index)) {
        best = { index, length: snip.length };
      }
    }
    if (best === null) {
      parts.push({ text: remaining, highlight: false });
      break;
    }
    if (best.index > 0) {
      parts.push({
        text: remaining.slice(0, best.index),
        highlight: false,
      });
    }
    parts.push({
      text: remaining.slice(best.index, best.index + best.length),
      highlight: true,
    });
    remaining = remaining.slice(best.index + best.length);
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted p-3 text-foreground text-sm">
      <p className="mb-2 text-muted-foreground text-xs font-medium">
        Extracted text — highlighted phrases contributed to extracted entities
      </p>
      <p className="whitespace-pre-wrap">
        {parts.map((part, i) =>
          part.highlight ? (
            <mark key={i} className="rounded bg-primary/20 px-0.5 font-medium text-primary">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
    </div>
  );
}
