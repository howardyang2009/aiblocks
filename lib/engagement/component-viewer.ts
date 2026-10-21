import type { PublicProfile } from "@/lib/identity/public-profile";
import type { Review } from "@/lib/engagement/review-list";
import type { CommentNode } from "@/lib/engagement/comment-thread";

// The per-Viewer half of a Component page. The page itself is cached and
// rendered as if signed out (no Star, no ownership, nothing `mine`); the
// browser fetches this from GET /api/components/[id]/viewer and lays it
// over the cached Reviews and Comments. No React and no Supabase here.

export type ComponentViewerState = {
  signedIn: boolean;
  viewer: PublicProfile | null;
  isSeller: boolean;
  owned: boolean;
  starred: boolean;
  myReviewId: string | null;
  myCommentIds: string[];
};

export const SIGNED_OUT: ComponentViewerState = {
  signedIn: false,
  viewer: null,
  isSeller: false,
  owned: false,
  starred: false,
  myReviewId: null,
  myCommentIds: [],
};

export function markMyReview(reviews: Review[], state: ComponentViewerState): Review[] {
  return reviews.map((r) => ({ ...r, mine: r.id === state.myReviewId }));
}

// The Seller badge is the Comment author's, so it is already in the cached
// thread; only `mine` depends on who is looking.
export function markMyComments(comments: CommentNode[], state: ComponentViewerState): CommentNode[] {
  const mine = new Set(state.myCommentIds);
  const mark = (c: CommentNode): CommentNode => ({ ...c, mine: mine.has(c.id), replies: c.replies.map(mark) });
  return comments.map(mark);
}
