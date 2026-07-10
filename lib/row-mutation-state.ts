// The per-row busy/error transitions behind use-row-mutation.ts — pure, no
// React, no fetch. A row's entry is present only while it's busy or holding
// an error from its last attempt; a settled, error-free row goes back to
// having no entry at all, which is what isBusy/errorFor treat as idle.

export type RowState = { busy: boolean; error: string | null };
export type RowMap = Map<string, RowState>;

export function markBusy(rows: RowMap, id: string): RowMap {
  const next = new Map(rows);
  next.set(id, { busy: true, error: null });
  return next;
}

// `result` is whatever an engagement/commerce flow (e.g. runRemoveCommentFlow)
// resolved to — every flow result already shares this status/error shape.
// `error` is typed optional (rather than a status-discriminated union)
// because a plain `status: string` can't be narrowed away from the literal
// "error" by TypeScript's control-flow analysis.
export function settle(rows: RowMap, id: string, result: { status: string; error?: string }): RowMap {
  const next = new Map(rows);
  if (result.status === "error" && result.error !== undefined) {
    next.set(id, { busy: false, error: result.error });
  } else {
    next.delete(id);
  }
  return next;
}

export function clearRow(rows: RowMap, id: string): RowMap {
  const next = new Map(rows);
  next.delete(id);
  return next;
}

export function isBusy(rows: RowMap, id: string): boolean {
  return rows.get(id)?.busy ?? false;
}

export function errorFor(rows: RowMap, id: string): string | null {
  return rows.get(id)?.error ?? null;
}
