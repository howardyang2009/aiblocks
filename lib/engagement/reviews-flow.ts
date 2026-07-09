import { buildReview, upsertReview, removeMyReview, type Review } from "@/lib/engagement/reviews-section-state";

// The reviews-section flows: each takes the current list and returns the
// next one, so create/update/delete a review (and a seller's reply to one)
// is one tested interface end to end — same reducer shape as
// lib/engagement/comments-flow.ts.

export type SubmitReviewDeps = {
  submitReview: (
    rating: number,
    body: string
  ) => Promise<
    | { ok: true; review: { id: string; rating: number; body: string | null; created_at: string } }
    | { ok: false; error: string }
  >;
};

export type SubmitReviewResult =
  | { status: "error"; error: string }
  | { status: "saved"; reviews: Review[] };

// `mine` is the caller's existing review, if any — its reviewer identity and
// seller reply carry forward, since the POST response only echoes back
// {id, rating, body, created_at}.
export async function runSubmitReviewFlow(
  deps: SubmitReviewDeps,
  args: { reviews: Review[]; rating: number; body: string; mine: Review | null }
): Promise<SubmitReviewResult> {
  if (!args.rating) return { status: "error", error: "Pick a star rating first." };

  const result = await deps.submitReview(args.rating, args.body);
  if (!result.ok) return { status: "error", error: result.error };

  const saved = buildReview(result.review, {
    reviewer: args.mine?.reviewer ?? null,
    reply: args.mine?.reply ?? null,
  });
  return { status: "saved", reviews: upsertReview(args.reviews, saved) };
}

export type RemoveReviewDeps = {
  removeReview: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type RemoveReviewResult =
  | { status: "error"; error: string }
  | { status: "removed"; reviews: Review[] };

export async function runRemoveReviewFlow(
  deps: RemoveReviewDeps,
  args: { reviews: Review[] }
): Promise<RemoveReviewResult> {
  const result = await deps.removeReview();
  if (!result.ok) return { status: "error", error: result.error };

  return { status: "removed", reviews: removeMyReview(args.reviews) };
}

export type SaveReplyDeps = {
  saveReply: (
    reviewId: string,
    body: string
  ) => Promise<{ ok: true; reply: { body: string; created_at: string } } | { ok: false; error: string }>;
};

export type SaveReplyResult = { status: "error"; error: string } | { status: "saved"; reviews: Review[] };

export async function runSaveReplyFlow(
  deps: SaveReplyDeps,
  args: { reviews: Review[]; reviewId: string; body: string }
): Promise<SaveReplyResult> {
  if (!args.body.trim()) return { status: "error", error: "Reply text is required." };

  const result = await deps.saveReply(args.reviewId, args.body);
  if (!result.ok) return { status: "error", error: result.error };

  const reviews = args.reviews.map((r) =>
    r.id === args.reviewId ? { ...r, reply: { body: result.reply.body, created_at: result.reply.created_at } } : r
  );
  return { status: "saved", reviews };
}

export type RemoveReplyDeps = {
  removeReply: (reviewId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type RemoveReplyResult =
  | { status: "error"; error: string }
  | { status: "removed"; reviews: Review[] };

export async function runRemoveReplyFlow(
  deps: RemoveReplyDeps,
  args: { reviews: Review[]; reviewId: string }
): Promise<RemoveReplyResult> {
  const result = await deps.removeReply(args.reviewId);
  if (!result.ok) return { status: "error", error: result.error };

  const reviews = args.reviews.map((r) => (r.id === args.reviewId ? { ...r, reply: null } : r));
  return { status: "removed", reviews };
}
