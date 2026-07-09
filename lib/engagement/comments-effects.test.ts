import { describe, it, expect, vi } from "vitest";
import { removeCommentEffect } from "@/lib/engagement/comments-effects";

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

describe("removeCommentEffect", () => {
  it("DELETEs the comment by id and reports success", async () => {
    const fetchImpl = fakeFetch({ ok: true });

    const result = await removeCommentEffect(fetchImpl, "c1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/comments/c1", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: { error: "Not your comment." } });

    const result = await removeCommentEffect(fetchImpl, "c1");

    expect(result).toEqual({ ok: false, error: "Not your comment." });
  });

  it("falls back to a generic error when the server sends none", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await removeCommentEffect(fetchImpl, "c1");

    expect(result).toEqual({ ok: false, error: "Could not delete the comment. Try again." });
  });
});
