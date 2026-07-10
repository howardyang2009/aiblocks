import { describe, it, expect, vi } from "vitest";
import {
  submitReviewEffect,
  removeReviewEffect,
  saveReplyEffect,
  removeReplyEffect,
} from "@/lib/engagement/reviews-effects";

// Only each wrapper's own logic is tested here — see comments-effects.test.ts
// for why the failure paths aren't re-tested per wrapper.

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

describe("submitReviewEffect", () => {
  it("POSTs the rating and body, and returns the saved review", async () => {
    const fetchImpl = fakeFetch({
      ok: true,
      body: { id: "r1", rating: 5, body: "great", created_at: "2026-01-01T00:00:00Z" },
    });

    const result = await submitReviewEffect(fetchImpl, "comp1", 5, "great");

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, body: "great" }),
    });
    expect(result).toEqual({
      ok: true,
      review: { id: "r1", rating: 5, body: "great", created_at: "2026-01-01T00:00:00Z" },
    });
  });
});

describe("removeReviewEffect", () => {
  it("DELETEs the caller's review on this component", async () => {
    const fetchImpl = fakeFetch({ ok: true });

    const result = await removeReviewEffect(fetchImpl, "comp1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1/reviews", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
  });
});

describe("saveReplyEffect", () => {
  it("POSTs the seller's reply body and returns the saved reply", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { body: "thanks!", created_at: "2026-01-02T00:00:00Z" } });

    const result = await saveReplyEffect(fetchImpl, "r1", "thanks!");

    expect(fetchImpl).toHaveBeenCalledWith("/api/reviews/r1/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "thanks!" }),
    });
    expect(result).toEqual({ ok: true, reply: { body: "thanks!", created_at: "2026-01-02T00:00:00Z" } });
  });
});

describe("removeReplyEffect", () => {
  it("DELETEs the seller's reply on this review", async () => {
    const fetchImpl = fakeFetch({ ok: true });

    const result = await removeReplyEffect(fetchImpl, "r1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/reviews/r1/reply", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
  });
});
