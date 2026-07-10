import { describe, it, expect } from "vitest";
import { buildReview, upsertReview, removeMyReview, type Review } from "@/lib/engagement/reviews-section-state";
import type { PublicProfile } from "@/lib/identity/public-profile";

const reviewer: PublicProfile = { username: "buyer1", display_name: "Buyer One", avatar_url: null };

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "rev1",
    rating: 5,
    body: "Great component",
    created_at: "2026-01-01T00:00:00Z",
    reviewer,
    mine: false,
    reply: null,
    ...overrides,
  };
}

describe("buildReview", () => {
  it("builds a review from the response and context", () => {
    const result = buildReview(
      { id: "rev1", rating: 4, body: "Pretty good", created_at: "2026-01-01T00:00:00Z" },
      { reviewer, reply: null }
    );
    expect(result).toEqual({
      id: "rev1",
      rating: 4,
      body: "Pretty good",
      created_at: "2026-01-01T00:00:00Z",
      reviewer: { username: "buyer1", display_name: "Buyer One", avatar_url: null },
      mine: true,
      reply: null,
    });
  });

  it("falls back to a placeholder identity when there is no prior reviewer (first-time review)", () => {
    const result = buildReview(
      { id: "rev1", rating: 3, body: null, created_at: "2026-01-01T00:00:00Z" },
      { reviewer: null, reply: null }
    );
    expect(result.reviewer).toEqual({ username: "you", display_name: "You", avatar_url: null });
  });

  it("carries forward an existing seller reply across an edit — the response doesn't include it", () => {
    const existingReply = { body: "Thanks!", created_at: "2026-01-02T00:00:00Z" };
    const result = buildReview(
      { id: "rev1", rating: 2, body: "changed my mind", created_at: "2026-01-01T00:00:00Z" },
      { reviewer, reply: existingReply }
    );
    expect(result.reply).toEqual(existingReply);
  });

  it("has no reply when there was none before (new review, or edit of an unreplied one)", () => {
    const result = buildReview(
      { id: "rev1", rating: 5, body: null, created_at: "2026-01-01T00:00:00Z" },
      { reviewer, reply: null }
    );
    expect(result.reply).toBeNull();
  });

  it("always marks the built review as mine", () => {
    const result = buildReview(
      { id: "rev1", rating: 5, body: null, created_at: "2026-01-01T00:00:00Z" },
      { reviewer, reply: null }
    );
    expect(result.mine).toBe(true);
  });
});

describe("upsertReview", () => {
  it("puts a brand-new review first when none was previously mine", () => {
    const other = review({ id: "other1" });
    const fresh = review({ id: "rev1", mine: true });
    expect(upsertReview([other], fresh)).toEqual([fresh, other]);
  });

  it("replaces the prior 'mine' review with the edited one, keeping it first", () => {
    const priorMine = review({ id: "rev1", rating: 3, mine: true });
    const other = review({ id: "other1" });
    const edited = review({ id: "rev1", rating: 5, mine: true });
    expect(upsertReview([priorMine, other], edited)).toEqual([edited, other]);
  });

  it("leaves other reviews untouched (same reference) when upserting", () => {
    const other = review({ id: "other1" });
    const fresh = review({ id: "rev1", mine: true });
    const result = upsertReview([other], fresh);
    expect(result[1]).toBe(other);
  });
});

describe("removeMyReview", () => {
  it("removes the review marked mine", () => {
    const mine = review({ id: "rev1", mine: true });
    const other = review({ id: "other1" });
    expect(removeMyReview([mine, other])).toEqual([other]);
  });

  it("is a no-op when no review is mine", () => {
    const other = review({ id: "other1" });
    expect(removeMyReview([other])).toEqual([other]);
  });
});
