"use client";

import { useState } from "react";

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
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    setStarred((s) => !s);
    setCount((n) => (starred ? n - 1 : n + 1));
    try {
      await fetch(`/api/components/${componentId}/star`, { method: "POST" });
    } catch {
      // revert on failure
      setStarred((s) => !s);
      setCount((n) => (starred ? n + 1 : n - 1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-block border px-3 py-1.5 text-sm transition-colors ${
        starred ? "border-accent text-accent" : "text-muted hover:border-accent"
      }`}
    >
      <span>★</span>
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}
