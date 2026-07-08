"use client";

import { useState } from "react";
import type { SearchResult } from "@/lib/external-search/types";

const MAX_DESC_CHARS = 400;

// The only client-side island in this feature: expanding a long
// description doesn't need a page navigation or a server round-trip.
export function ExternalResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const description = result.description ?? "";
  const isLong = description.length > MAX_DESC_CHARS;
  const shown = expanded || !isLong ? description : `${description.slice(0, MAX_DESC_CHARS)}…`;

  return (
    <div className="rounded-block border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="font-display font-medium leading-tight hover:text-accent"
        >
          {result.title}
        </a>
        {typeof result.stars === "number" && (
          <span className="font-mono text-[11px] text-subtle shrink-0">★ {result.stars}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {(result.sources ?? [result.source]).map((s) => (
          <span key={s} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">
            {s}
          </span>
        ))}
      </div>

      {description && (
        <p className="mt-2 text-sm text-muted">
          {shown}
          {isLong && (
            <button
              type="button"
              className="ml-1 text-accent hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
