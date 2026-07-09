import { describe, it, expect } from "vitest";
import {
  runSubmitReviewFlow,
  runRemoveReviewFlow,
  runSaveReplyFlow,
  runRemoveReplyFlow,
  type SubmitReviewDeps,
  type RemoveReviewDeps,
  type SaveReplyDeps,
  type RemoveReplyDeps,
} from "@/lib/reviews-flow";
import type { Review } from "@/lib/reviews-section-state";
import type { PublicProfile } from "@/lib/public-profile";

const reviewer: PublicProfile = { username: "alice", display_name: "Alice", avatar_url: null };

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    rating: 4,
    body: "solid",
    created_at: "2026-01-01T00:00:00Z",
    reviewer,
    mine: false,
    reply: null,
    ...overrides,
  };
}

type EffectResult<T extends object = {}> = ({ ok: true } & T) | { ok: false; error: string };

function fakeSubmitDeps(
  result: EffectResult<{ review: { id: string; rating: number; body: string | null; created_at: string } }>
): SubmitReviewDeps & { calls: { rating: number; body: string }[] } {
  const deps = {
    calls: [] as { rating: number; body: string }[],
    submitReview: async (rating: number, body: string) => {
      deps.calls.push({ rating, body });
      return result;
    },
  };
  return deps;
}

describe("runSubmitReviewFlow", () => {
  it("rejects a missing rating without calling the effect", async () => {
    const deps = fakeSubmitDeps({ ok: true, review: { id: "r2", rating: 5, body: "", created_at: "" } });
    const result = await runSubmitReviewFlow(deps, { reviews: [], rating: 0, body: "", mine: null });
    expect(result).toEqual({ status: "error", error: "Pick a star rating first." });
    expect(deps.calls).toEqual([]);
  });

  it("publishes a new review and prepends it to the list", async () => {
    const deps = fakeSubmitDeps({
      ok: true,
      review: { id: "r2", rating: 5, body: "great", created_at: "2026-02-02T00:00:00Z" },
    });
    const viewerReviewer: PublicProfile = { username: "bob", display_name: "Bob", avatar_url: null };

    const result = await runSubmitReviewFlow(deps, {
      reviews: [review({ id: "r1", mine: false })],
      rating: 5,
      body: "great",
      mine: null,
    });

    expect(deps.calls).toEqual([{ rating: 5, body: "great" }]);
    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("unreachable");
    expect(result.reviews[0]).toMatchObject({ id: "r2", rating: 5, mine: true });
    expect(result.reviews).toHaveLength(2);
    void viewerReviewer;
  });

  it("carries the existing seller reply forward when editing your own review", async () => {
    const existing = review({
      id: "r1",
      mine: true,
      reply: { body: "thanks!", created_at: "2026-01-05T00:00:00Z" },
    });
    const deps = fakeSubmitDeps({
      ok: true,
      review: { id: "r1", rating: 3, body: "updated", created_at: "2026-01-01T00:00:00Z" },
    });

    const result = await runSubmitReviewFlow(deps, {
      reviews: [existing],
      rating: 3,
      body: "updated",
      mine: existing,
    });

    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("unreachable");
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].reply).toEqual({ body: "thanks!", created_at: "2026-01-05T00:00:00Z" });
  });

  it("surfaces the effect's error", async () => {
    const deps = fakeSubmitDeps({ ok: false, error: "Could not save the review. Try again." });
    const result = await runSubmitReviewFlow(deps, { reviews: [], rating: 4, body: "", mine: null });
    expect(result).toEqual({ status: "error", error: "Could not save the review. Try again." });
  });
});

function fakeRemoveReviewDeps(result: { ok: true } | { ok: false; error: string }): RemoveReviewDeps & {
  calls: number;
} {
  const deps = {
    calls: 0,
    removeReview: async () => {
      deps.calls++;
      return result;
    },
  };
  return deps;
}

describe("runRemoveReviewFlow", () => {
  it("removes the caller's own review from the list", async () => {
    const deps = fakeRemoveReviewDeps({ ok: true });
    const result = await runRemoveReviewFlow(deps, {
      reviews: [review({ id: "r1", mine: true }), review({ id: "r2", mine: false })],
    });
    expect(deps.calls).toBe(1);
    expect(result).toEqual({ status: "removed", reviews: [review({ id: "r2", mine: false })] });
  });

  it("surfaces the effect's error", async () => {
    const deps = fakeRemoveReviewDeps({ ok: false, error: "Could not delete the review. Try again." });
    const result = await runRemoveReviewFlow(deps, { reviews: [review({ mine: true })] });
    expect(result).toEqual({ status: "error", error: "Could not delete the review. Try again." });
  });
});

function fakeSaveReplyDeps(
  result: EffectResult<{ reply: { body: string; created_at: string } }>
): SaveReplyDeps & { calls: { reviewId: string; body: string }[] } {
  const deps = {
    calls: [] as { reviewId: string; body: string }[],
    saveReply: async (reviewId: string, body: string) => {
      deps.calls.push({ reviewId, body });
      return result;
    },
  };
  return deps;
}

describe("runSaveReplyFlow", () => {
  it("rejects blank reply text without calling the effect", async () => {
    const deps = fakeSaveReplyDeps({ ok: true, reply: { body: "x", created_at: "" } });
    const result = await runSaveReplyFlow(deps, { reviews: [review()], reviewId: "r1", body: "   " });
    expect(result).toEqual({ status: "error", error: "Reply text is required." });
    expect(deps.calls).toEqual([]);
  });

  it("saves the reply onto the matching review, leaving others untouched", async () => {
    const deps = fakeSaveReplyDeps({
      ok: true,
      reply: { body: "thanks for the feedback", created_at: "2026-03-01T00:00:00Z" },
    });
    const result = await runSaveReplyFlow(deps, {
      reviews: [review({ id: "r1" }), review({ id: "r2" })],
      reviewId: "r1",
      body: "thanks for the feedback",
    });
    expect(deps.calls).toEqual([{ reviewId: "r1", body: "thanks for the feedback" }]);
    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("unreachable");
    expect(result.reviews.find((r) => r.id === "r1")?.reply).toEqual({
      body: "thanks for the feedback",
      created_at: "2026-03-01T00:00:00Z",
    });
    expect(result.reviews.find((r) => r.id === "r2")?.reply).toBeNull();
  });

  it("surfaces the effect's error", async () => {
    const deps = fakeSaveReplyDeps({ ok: false, error: "Could not save the reply. Try again." });
    const result = await runSaveReplyFlow(deps, { reviews: [review()], reviewId: "r1", body: "hi" });
    expect(result).toEqual({ status: "error", error: "Could not save the reply. Try again." });
  });
});

function fakeRemoveReplyDeps(
  result: { ok: true } | { ok: false; error: string }
): RemoveReplyDeps & { calls: string[] } {
  const deps = {
    calls: [] as string[],
    removeReply: async (reviewId: string) => {
      deps.calls.push(reviewId);
      return result;
    },
  };
  return deps;
}

describe("runRemoveReplyFlow", () => {
  it("clears the reply on the matching review", async () => {
    const deps = fakeRemoveReplyDeps({ ok: true });
    const result = await runRemoveReplyFlow(deps, {
      reviews: [review({ id: "r1", reply: { body: "old", created_at: "" } })],
      reviewId: "r1",
    });
    expect(deps.calls).toEqual(["r1"]);
    expect(result).toEqual({
      status: "removed",
      reviews: [review({ id: "r1", reply: null })],
    });
  });

  it("surfaces the effect's error", async () => {
    const deps = fakeRemoveReplyDeps({ ok: false, error: "Could not delete the reply. Try again." });
    const result = await runRemoveReplyFlow(deps, {
      reviews: [review({ id: "r1", reply: { body: "old", created_at: "" } })],
      reviewId: "r1",
    });
    expect(result).toEqual({ status: "error", error: "Could not delete the reply. Try again." });
  });
});
