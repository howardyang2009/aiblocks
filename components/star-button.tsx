"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type StarState = { starred: boolean; count: number };

// Optimistic Star. POSTs the state the Viewer asked for to
// /api/components/[id]/star (idempotent, see lib/engagement/stars.ts) and
// then shows the server's answer; a failed request reverts.
export function StarButton({
  componentId,
  initialCount,
  initialStarred = false,
}: {
  componentId: string;
  initialCount: number;
  initialStarred?: boolean;
}) {
  const locale = useLocale();
  const [state, setState] = useState<StarState>({ starred: initialStarred, count: initialCount });
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const previous = state;
    const starred = !previous.starred;
    setState({ starred, count: previous.count + (starred ? 1 : -1) });
    try {
      const res = await fetch(`/api/components/${componentId}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred }),
      });
      setState(res.ok ? ((await res.json()) as StarState) : previous);
    } catch {
      setState(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      data-testid="star-button"
      className={`inline-flex items-center gap-1.5 rounded-block border px-3 py-1.5 text-sm transition-colors ${
        state.starred ? "border-accent text-accent" : "text-muted hover:border-accent"
      }`}
    >
      {pending ? <Spinner className="h-3.5 w-3.5" /> : <span>★</span>}
      <span className="font-mono text-xs">{formatNumber(state.count, locale)}</span>
    </button>
  );
}
