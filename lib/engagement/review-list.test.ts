import { describe, it, expect, vi } from "vitest";
import {
  buildReviewList,
  ratingSummary,
  unloadedRatings,
  submitReview,
  deleteReview,
  saveReply,
  deleteReply,
  type Review,
} from "@/lib/engagement/review-list";
import type { PublicProfile } from "@/lib/identity/public-profile";

const alice: PublicProfile = { username: "alice", display_name: "Alice", avatar_url: null };
const messages = { fallback: "failed", network: "offline", ratingRequired: "rate", required: "required" };

function review(overrides: Partial<Review> = {}): Review {
  return { id: "r1", rating: 4, body: "ok", created_at: "1", reviewer: alice, mine: false, reply: null, ...overrides };
}

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status })
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("buildReviewList", () => {
  it("joins reviewer and Seller reply, and marks the viewer's Review", () => {
    const list = buildReviewList(
      [
        { id: "a", buyer_id: "u1", rating: 5, body: "great", created_at: "2" },
        { id: "b", buyer_id: "me", rating: 3, body: null, created_at: "1" },
      ],
      {
        reviewers: [{ id: "u1", username: "alice", display_name: "Alice", avatar_url: null }],
        replies: [{ review_id: "a", body: "thanks", created_at: "3" }],
        viewerId: "me",
      }
    );
    expect(list[0]).toMatchObject({ id: "a", reviewer: alice, mine: false, reply: { body: "thanks", created_at: "3" } });
    expect(list[1]).toMatchObject({ id: "b", mine: true, reply: null, reviewer: { username: "unknown" } });
  });
});

describe("submitReview", () => {
  const args = { componentId: "c1", rating: 5, body: "nice" };
  const saved = { id: "new", rating: 5, body: "nice", created_at: "9" };

  it("rejects a missing rating without a request", async () => {
    const fetch = fakeFetch(200, saved);
    expect(await submitReview({ fetch, messages }, { ...args, rating: 0 })).toEqual({ status: "error", error: "rate" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("POSTs rating and body, and puts a first Review first with a placeholder identity", async () => {
    const fetch = fakeFetch(200, saved);
    const result = await submitReview({ fetch, messages }, args);
    expect(fetch.mock.calls[0][0]).toBe("/api/components/c1/reviews");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ rating: 5, body: "nice" });
    if (result.status !== "saved") throw new Error("expected saved");
    const list = result.apply([review()]);
    expect(list.map((r) => r.id)).toEqual(["new", "r1"]);
    expect(list[0]).toMatchObject({ mine: true, reply: null, reviewer: { username: "you", display_name: "You" } });
  });

  it("replaces the viewer's previous Review, carrying its reviewer and Seller reply", async () => {
    const result = await submitReview({ fetch: fakeFetch(200, saved), messages }, args);
    if (result.status !== "saved") throw new Error("expected saved");
    const reply = { body: "thanks", created_at: "5" };
    const list = result.apply([review({ id: "other" }), review({ id: "old", mine: true, reply })]);
    expect(list.map((r) => r.id)).toEqual(["new", "other"]);
    expect(list[0]).toMatchObject({ reviewer: alice, reply });
  });

  it("forwards the server error", async () => {
    expect(await submitReview({ fetch: fakeFetch(403, { error: "notVerified" }), messages }, args)).toEqual({
      status: "error",
      error: "notVerified",
    });
  });
});

describe("deleteReview", () => {
  it("DELETEs and drops only the viewer's Review", async () => {
    const fetch = fakeFetch(200, {});
    const result = await deleteReview({ fetch, messages }, { componentId: "c1" });
    expect(fetch.mock.calls[0]).toEqual(["/api/components/c1/reviews", { method: "DELETE" }]);
    if (result.status !== "removed") throw new Error("expected removed");
    expect(result.apply([review({ id: "a" }), review({ id: "b", mine: true })]).map((r) => r.id)).toEqual(["a"]);
  });

  it("forwards the server error", async () => {
    expect(await deleteReview({ fetch: fakeFetch(500, {}), messages }, { componentId: "c1" })).toEqual({
      status: "error",
      error: "failed",
    });
  });
});

describe("Seller reply", () => {
  it("rejects a blank reply without a request", async () => {
    const fetch = fakeFetch(200, {});
    expect(await saveReply({ fetch, messages }, { reviewId: "a", body: "  " })).toEqual({ status: "error", error: "required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("saves the reply onto the matching Review only", async () => {
    const fetch = fakeFetch(200, { body: "thanks", created_at: "7" });
    const result = await saveReply({ fetch, messages }, { reviewId: "a", body: "thanks" });
    expect(fetch.mock.calls[0][0]).toBe("/api/reviews/a/reply");
    if (result.status !== "saved") throw new Error("expected saved");
    const list = result.apply([review({ id: "a" }), review({ id: "b" })]);
    expect(list[0].reply).toEqual({ body: "thanks", created_at: "7" });
    expect(list[1].reply).toBeNull();
  });

  it("clears the reply on the matching Review", async () => {
    const result = await deleteReply({ fetch: fakeFetch(200, {}), messages }, { reviewId: "a" });
    if (result.status !== "removed") throw new Error("expected removed");
    const list = result.apply([review({ id: "a", reply: { body: "x", created_at: "1" } })]);
    expect(list[0].reply).toBeNull();
  });

  it("forwards the network failure", async () => {
    const offline = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await deleteReply({ fetch: offline, messages }, { reviewId: "a" })).toEqual({ status: "error", error: "offline" });
  });
});

describe("concurrent requests", () => {
  // A Seller reply settles after the Buyer's edit was applied: the edit
  // must survive, and the reply lands on the latest list.
  it("applies each result to the latest list", async () => {
    let list = [review({ id: "a" })];
    const edit = await submitReview(
      { fetch: fakeFetch(200, { id: "mine", rating: 2, body: null, created_at: "2" }), messages },
      { componentId: "c", rating: 2, body: "" }
    );
    const reply = await saveReply({ fetch: fakeFetch(200, { body: "hi", created_at: "3" }), messages }, { reviewId: "a", body: "hi" });
    if (edit.status !== "saved" || reply.status !== "saved") throw new Error("setup");
    list = edit.apply(list);
    list = reply.apply(list);
    expect(list.map((r) => [r.id, r.reply?.body ?? null])).toEqual([["mine", null], ["a", "hi"]]);
  });
});

describe("rating summary", () => {
  it("adds the unlisted Reviews to the listed ones", () => {
    const listed = [review({ rating: 5 }), review({ id: "r2", rating: 3 })];
    const unloaded = unloadedRatings([5, 3, 1, 1], listed);
    expect(unloaded).toEqual({ count: 2, sum: 2 });
    expect(ratingSummary(unloaded, listed)).toEqual({ count: 4, average: 2.5 });
  });

  it("follows the viewer's own Review as the list changes", () => {
    const unloaded = { count: 2, sum: 2 };
    expect(ratingSummary(unloaded, [review({ rating: 5, mine: true })])).toEqual({ count: 3, average: 7 / 3 });
    expect(ratingSummary(unloaded, [])).toEqual({ count: 2, average: 1 });
  });

  it("has no average without Reviews", () => {
    expect(ratingSummary({ count: 0, sum: 0 }, [])).toEqual({ count: 0, average: null });
  });
});
