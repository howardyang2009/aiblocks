import { describe, it, expect, vi } from "vitest";
import { postCommentEffect, removeCommentEffect } from "@/lib/engagement/comments-effects";

// Only each wrapper's own logic is tested here — which URL/method/body it
// sends, and how it shapes a successful response. The failure paths
// (server error message, fallback, network exception) are runClientAction's
// behavior, already exhaustively covered in lib/client-action.test.ts; every
// wrapper here forwards that result unchanged on failure, so re-testing it
// per wrapper would only prove runClientAction again.

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

describe("postCommentEffect", () => {
  it("POSTs the body and parentId, and returns the saved comment", async () => {
    const fetchImpl = fakeFetch({
      ok: true,
      body: { id: "c1", body: "hi", created_at: "2026-01-01T00:00:00Z" },
    });

    const result = await postCommentEffect(fetchImpl, "comp1", "hi", "top1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "hi", parentId: "top1" }),
    });
    expect(result).toEqual({ ok: true, comment: { id: "c1", body: "hi", created_at: "2026-01-01T00:00:00Z" } });
  });
});

describe("removeCommentEffect", () => {
  it("DELETEs the comment by id and reports success", async () => {
    const fetchImpl = fakeFetch({ ok: true });

    const result = await removeCommentEffect(fetchImpl, "c1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/comments/c1", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
  });
});
