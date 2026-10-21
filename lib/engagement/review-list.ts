import { runClientAction, type ClientActionMessages } from "@/lib/client-action";
import { toPublicProfile, type PublicProfile } from "@/lib/identity/public-profile";

// The Review list on a Component page: building it from rows (server), and
// a Buyer's Review plus the Seller reply to it (client). No React here.
//
// Every operation returns `apply`, a transition from the LATEST list to the
// next one, so callers use a functional state update and two requests in
// flight can't overwrite each other's result with a stale snapshot.

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer: PublicProfile;
  mine: boolean;
  reply: { body: string; created_at: string } | null;
};

type Transition = (latest: Review[]) => Review[];
type Failure = { status: "error"; error: string };
type Messages = ClientActionMessages;

export function buildReviewList(
  rows: { id: string; buyer_id: string; rating: number; body: string | null; created_at: string }[],
  context: {
    reviewers: { id: string; username: string; display_name: string | null; avatar_url: string | null }[];
    replies: { review_id: string; body: string; created_at: string }[];
    viewerId: string | null;
  }
): Review[] {
  const reviewerById = new Map(context.reviewers.map((p) => [p.id, p]));
  const replyByReviewId = new Map(context.replies.map((r) => [r.review_id, r]));
  return rows.map((r) => {
    const reply = replyByReviewId.get(r.id);
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      reviewer: toPublicProfile(reviewerById.get(r.buyer_id)),
      mine: context.viewerId !== null && r.buyer_id === context.viewerId,
      reply: reply ? { body: reply.body, created_at: reply.created_at } : null,
    };
  });
}

// The page loads at most a page of Reviews, but the summary counts all of
// them. `unloaded` totals the Reviews not in the list, so the summary stays
// right as the viewer adds, edits or deletes their own Review.
export type RatingTotals = { count: number; sum: number };

export function unloadedRatings(allRatings: number[], loaded: Review[]): RatingTotals {
  const sum = (ratings: number[]) => ratings.reduce((total, r) => total + r, 0);
  return {
    count: Math.max(0, allRatings.length - loaded.length),
    sum: sum(allRatings) - sum(loaded.map((r) => r.rating)),
  };
}

export function ratingSummary(unloaded: RatingTotals, reviews: Review[]): { count: number; average: number | null } {
  const count = unloaded.count + reviews.length;
  const sum = unloaded.sum + reviews.reduce((total, r) => total + r.rating, 0);
  return { count, average: count ? sum / count : null };
}

// One Review per Buyer per Component (the POST upserts). The saved Review
// goes first and replaces whichever entry was the viewer's before; its
// reviewer identity and Seller reply carry over, since the response only
// echoes {id, rating, body, created_at}.
export async function submitReview(
  deps: { fetch: typeof fetch; messages: Messages & { ratingRequired: string } },
  args: { componentId: string; rating: number; body: string }
): Promise<Failure | { status: "saved"; apply: Transition }> {
  if (!args.rating) return { status: "error", error: deps.messages.ratingRequired };

  const result = await runClientAction<{ id: string; rating: number; body: string | null; created_at: string }>(
    deps.fetch,
    `/api/components/${args.componentId}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: args.rating, body: args.body }),
    },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };

  const saved = result.data;
  return {
    status: "saved",
    apply: (latest) => {
      const previous = latest.find((r) => r.mine) ?? null;
      const review: Review = {
        ...saved,
        reviewer: toPublicProfile(previous?.reviewer, "you", "You"),
        mine: true,
        reply: previous?.reply ?? null,
      };
      return [review, ...latest.filter((r) => !r.mine)];
    },
  };
}

export async function deleteReview(
  deps: { fetch: typeof fetch; messages: Messages },
  args: { componentId: string }
): Promise<Failure | { status: "removed"; apply: Transition }> {
  const result = await runClientAction<object>(
    deps.fetch,
    `/api/components/${args.componentId}/reviews`,
    { method: "DELETE" },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };
  return { status: "removed", apply: (latest) => latest.filter((r) => !r.mine) };
}

export async function saveReply(
  deps: { fetch: typeof fetch; messages: Messages & { required: string } },
  args: { reviewId: string; body: string }
): Promise<Failure | { status: "saved"; apply: Transition }> {
  if (!args.body.trim()) return { status: "error", error: deps.messages.required };

  const result = await runClientAction<{ body: string; created_at: string }>(
    deps.fetch,
    `/api/reviews/${args.reviewId}/reply`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: args.body }) },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };

  const reply = { body: result.data.body, created_at: result.data.created_at };
  return { status: "saved", apply: (latest) => latest.map((r) => (r.id === args.reviewId ? { ...r, reply } : r)) };
}

export async function deleteReply(
  deps: { fetch: typeof fetch; messages: Messages },
  args: { reviewId: string }
): Promise<Failure | { status: "removed"; apply: Transition }> {
  const result = await runClientAction<object>(
    deps.fetch,
    `/api/reviews/${args.reviewId}/reply`,
    { method: "DELETE" },
    deps.messages
  );
  if (!result.ok) return { status: "error", error: result.error };
  return {
    status: "removed",
    apply: (latest) => latest.map((r) => (r.id === args.reviewId ? { ...r, reply: null } : r)),
  };
}
