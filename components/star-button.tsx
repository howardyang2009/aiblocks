"use client";

import { useState } from "react";
import { applyOptimisticToggle, resolveToggle, type StarState } from "@/lib/engagement/star-button-state";
import { Spinner } from "@/components/ui/spinner";

// Optimistic star toggle. POSTs to /api/components/[id]/star.
export function StarButton({
  componentId,
  initialCount,
  initialStarred = false,
}: {
  componentId: string;
  initialCount: number;
  initialStarred?: boolean;
}) {
  const [state, setState] = useState<StarState>({ starred: initialStarred, count: initialCount });
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const previous = state;
    const optimistic = applyOptimisticToggle(previous);
    setState(optimistic);
    try {
      const res = await fetch(`/api/components/${componentId}/star`, { method: "POST" });
      setState(resolveToggle(previous, optimistic, res.ok));
    } catch {
      setState(resolveToggle(previous, optimistic, false));
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
      <span className="font-mono text-xs">{state.count}</span>
    </button>
  );
}
