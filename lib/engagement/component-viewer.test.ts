import { describe, it, expect } from "vitest";
import { markMyComments, markMyReview, SIGNED_OUT, type ComponentViewerState } from "@/lib/engagement/component-viewer";
import type { Review } from "@/lib/engagement/review-list";
import type { CommentNode } from "@/lib/engagement/comment-thread";

const author = { username: "a", display_name: null, avatar_url: null };

function review(id: string): Review {
  return { id, rating: 5, body: null, created_at: "", reviewer: author, mine: false, reply: null };
}

function comment(id: string, replies: CommentNode[] = []): CommentNode {
  return { id, body: "", created_at: "", author, isSeller: false, mine: false, replies };
}

const state = (overrides: Partial<ComponentViewerState>): ComponentViewerState => ({ ...SIGNED_OUT, signedIn: true, ...overrides });

describe("markMyReview", () => {
  it("marks only the Viewer's own Review", () => {
    const marked = markMyReview([review("r1"), review("r2")], state({ myReviewId: "r2" }));
    expect(marked.map((r) => r.mine)).toEqual([false, true]);
  });

  it("marks nothing when signed out", () => {
    expect(markMyReview([review("r1")], SIGNED_OUT).map((r) => r.mine)).toEqual([false]);
  });
});

describe("markMyComments", () => {
  it("marks the Viewer's own Comments and replies at any depth", () => {
    const marked = markMyComments([comment("c1", [comment("c2"), comment("c3")]), comment("c4")], state({ myCommentIds: ["c1", "c3"] }));
    expect(marked[0].mine).toBe(true);
    expect(marked[0].replies.map((r) => r.mine)).toEqual([false, true]);
    expect(marked[1].mine).toBe(false);
  });
});
