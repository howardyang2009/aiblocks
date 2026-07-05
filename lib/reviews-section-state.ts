import { toPublicProfile, type PublicProfile } from "@/lib/public-profile";

// The optimistic review-list transitions — pure, no fetch, no React. The
// component still owns the request, the star-picker/editing state, and the
// seller-reply editor; this is the list logic underneath.

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer: PublicProfile;
  mine: boolean;
  reply: {
    body: string;
    created_at: string;
  } | null;
};

// Shapes a freshly-posted-or-edited review from the POST response, which
// only carries {id, rating, body, created_at} — the reviewer identity and
// any existing seller reply belong to the review record, not the response,
// so they're carried forward from context instead of being dropped.
export function buildReview(
  response: { id: string; rating: number; body: string | null; created_at: string },
  context: { reviewer: PublicProfile | null; reply: Review["reply"] }
): Review {
  return {
    id: response.id,
    rating: response.rating,
    body: response.body,
    created_at: response.created_at,
    reviewer: toPublicProfile(context.reviewer, "you", "You"),
    mine: true,
    reply: context.reply,
  };
}

// One review per buyer (component_id, buyer_id unique -> POST upserts) —
// the new/edited review goes first, whichever entry was "mine" before is
// dropped (there's never more than one).
export function upsertReview(reviews: Review[], review: Review): Review[] {
  return [review, ...reviews.filter((r) => !r.mine)];
}

export function removeMyReview(reviews: Review[]): Review[] {
  return reviews.filter((r) => !r.mine);
}
