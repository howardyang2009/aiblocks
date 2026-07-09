"use client";

import { useState } from "react";
import { markBusy, settle, clearRow, isBusy, errorFor, type RowMap } from "@/lib/row-mutation-state";

// The thin React edge around row-mutation-state.ts's pure transitions —
// deliberately untested, same split as lib/identity/viewer.ts around
// resolve-viewer.ts. Holds one busy/error slot per row id, so a mutation on
// one row (e.g. deleting comment A) never disables another row's controls.
//
// `id` is caller-defined: an existing row's own id, or a synthetic key like
// "compose" for a composer that isn't editing an existing row yet. Callers
// that track two independent actions on the same underlying row (reviews:
// editing your own review vs. the seller's reply to it) should namespace
// their ids (e.g. `review:${id}` / `reply:${id}`) so the two don't share a
// busy/error slot.
export function useRowMutation() {
  const [rows, setRows] = useState<RowMap>(new Map());

  async function run<T extends { status: string; error?: string }>(
    id: string,
    flow: () => Promise<T>
  ): Promise<T> {
    setRows((current) => markBusy(current, id));
    const result = await flow();
    setRows((current) => settle(current, id, result));
    return result;
  }

  return {
    run,
    isBusy: (id: string) => isBusy(rows, id),
    errorFor: (id: string) => errorFor(rows, id),
    clear: (id: string) => setRows((current) => clearRow(current, id)),
  };
}
