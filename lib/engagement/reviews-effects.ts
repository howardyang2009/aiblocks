import { runClientAction } from "@/lib/client-action";

// The real effects behind the reviews-flow Deps types
// (lib/engagement/reviews-flow.ts) — built on the shared fetch/parse/catch in
// lib/client-action.ts instead of each repeating it.

export type SubmitReviewEffectResult =
  | { ok: true; review: { id: string; rating: number; body: string | null; created_at: string } }
  | { ok: false; error: string };

export async function submitReviewEffect(
  fetchImpl: typeof fetch,
  componentId: string,
  rating: number,
  body: string
): Promise<SubmitReviewEffectResult> {
  const result = await runClientAction<{ id: string; rating: number; body: string | null; created_at: string }>(
    fetchImpl,
    `/api/components/${componentId}/reviews`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, body }) },
    { fallback: "Could not save the review. Try again.", network: "Network error — the review was not saved." }
  );
  if (!result.ok) return result;
  return { ok: true, review: result.data };
}

export type RemoveReviewEffectResult = { ok: true } | { ok: false; error: string };

export async function removeReviewEffect(
  fetchImpl: typeof fetch,
  componentId: string
): Promise<RemoveReviewEffectResult> {
  const result = await runClientAction<object>(
    fetchImpl,
    `/api/components/${componentId}/reviews`,
    { method: "DELETE" },
    { fallback: "Could not delete the review. Try again.", network: "Network error — the review was not deleted." }
  );
  if (!result.ok) return result;
  return { ok: true };
}

export type SaveReplyEffectResult =
  | { ok: true; reply: { body: string; created_at: string } }
  | { ok: false; error: string };

export async function saveReplyEffect(
  fetchImpl: typeof fetch,
  reviewId: string,
  body: string
): Promise<SaveReplyEffectResult> {
  const result = await runClientAction<{ body: string; created_at: string }>(
    fetchImpl,
    `/api/reviews/${reviewId}/reply`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) },
    { fallback: "Could not save the reply. Try again.", network: "Network error — the reply was not saved." }
  );
  if (!result.ok) return result;
  return { ok: true, reply: result.data };
}

export type RemoveReplyEffectResult = { ok: true } | { ok: false; error: string };

export async function removeReplyEffect(
  fetchImpl: typeof fetch,
  reviewId: string
): Promise<RemoveReplyEffectResult> {
  const result = await runClientAction<object>(
    fetchImpl,
    `/api/reviews/${reviewId}/reply`,
    { method: "DELETE" },
    { fallback: "Could not delete the reply. Try again.", network: "Network error — the reply was not deleted." }
  );
  if (!result.ok) return result;
  return { ok: true };
}
