import { describe, it, expect } from "vitest";
import {
  runPostCommentFlow,
  runRemoveCommentFlow,
  type PostCommentDeps,
  type RemoveCommentDeps,
} from "@/lib/engagement/comments-flow";
import type { CommentNode } from "@/lib/engagement/comments-section-state";
import type { PublicProfile } from "@/lib/identity/public-profile";

const author: PublicProfile = { username: "alice", display_name: "Alice", avatar_url: null };

function node(overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id: "c1",
    body: "hello",
    created_at: "2026-01-01T00:00:00Z",
    author,
    isSeller: false,
    mine: false,
    replies: [],
    ...overrides,
  };
}

type PostCommentEffectResult =
  | { ok: true; comment: { id: string; body: string; created_at: string } }
  | { ok: false; error: string };

function fakePostDeps(
  result: PostCommentEffectResult
): PostCommentDeps & { calls: { body: string; parentId: string | null }[] } {
  const deps = {
    calls: [] as { body: string; parentId: string | null }[],
    postComment: async (body: string, parentId: string | null) => {
      deps.calls.push({ body, parentId });
      return result;
    },
  };
  return deps;
}

describe("runPostCommentFlow", () => {
  it("rejects blank text without calling the effect", async () => {
    const deps = fakePostDeps({ ok: true, comment: { id: "c2", body: "x", created_at: "" } });
    const result = await runPostCommentFlow(deps, {
      comments: [],
      body: "   ",
      parentId: null,
      viewer: null,
      isSeller: false,
    });
    expect(result).toEqual({ status: "error", error: "Comment text is required." });
    expect(deps.calls).toEqual([]);
  });

  it("posts a trimmed top-level comment and appends it to the thread", async () => {
    const deps = fakePostDeps({
      ok: true,
      comment: { id: "c2", body: "hi there", created_at: "2026-02-02T00:00:00Z" },
    });
    const viewer: PublicProfile = { username: "bob", display_name: "Bob", avatar_url: null };

    const result = await runPostCommentFlow(deps, {
      comments: [node({ id: "c1" })],
      body: "  hi there  ",
      parentId: null,
      viewer,
      isSeller: true,
    });

    expect(deps.calls).toEqual([{ body: "hi there", parentId: null }]);
    expect(result.status).toBe("posted");
    if (result.status !== "posted") throw new Error("unreachable");
    expect(result.comments).toHaveLength(2);
    expect(result.comments[1]).toMatchObject({
      id: "c2",
      body: "hi there",
      isSeller: true,
      mine: true,
    });
  });

  it("nests a reply under its parent", async () => {
    const deps = fakePostDeps({
      ok: true,
      comment: { id: "r1", body: "reply", created_at: "" },
    });
    const result = await runPostCommentFlow(deps, {
      comments: [node({ id: "c1" })],
      body: "reply",
      parentId: "c1",
      viewer: null,
      isSeller: false,
    });
    expect(result.status).toBe("posted");
    if (result.status !== "posted") throw new Error("unreachable");
    expect(result.comments[0].replies).toHaveLength(1);
    expect(result.comments[0].replies[0].id).toBe("r1");
  });

  it("surfaces the effect's error without mutating the thread", async () => {
    const deps = fakePostDeps({ ok: false, error: "Could not post the comment. Try again." });
    const result = await runPostCommentFlow(deps, {
      comments: [node({ id: "c1" })],
      body: "hi",
      parentId: null,
      viewer: null,
      isSeller: false,
    });
    expect(result).toEqual({ status: "error", error: "Could not post the comment. Try again." });
  });
});

function fakeRemoveDeps(
  result: { ok: true } | { ok: false; error: string }
): RemoveCommentDeps & { calls: number } {
  const deps = {
    calls: 0,
    removeComment: async () => {
      deps.calls++;
      return result;
    },
  };
  return deps;
}

describe("runRemoveCommentFlow", () => {
  it("asks for confirmation before deleting a comment that has replies, without calling the effect", async () => {
    const deps = fakeRemoveDeps({ ok: true });
    const withReplies = node({ id: "c1", replies: [node({ id: "r1" })] });
    const result = await runRemoveCommentFlow(deps, {
      comments: [withReplies],
      comment: withReplies,
      confirmed: false,
    });
    expect(result).toEqual({ status: "needs-confirmation" });
    expect(deps.calls).toBe(0);
  });

  it("does not require confirmation for a reply (no nested replies of its own)", async () => {
    const deps = fakeRemoveDeps({ ok: true });
    const reply = node({ id: "r1" });
    const result = await runRemoveCommentFlow(deps, {
      comments: [node({ id: "c1", replies: [reply] })],
      comment: reply,
      confirmed: false,
    });
    expect(result.status).toBe("removed");
    expect(deps.calls).toBe(1);
  });

  it("deletes once confirmed, cascading replies out of the thread", async () => {
    const deps = fakeRemoveDeps({ ok: true });
    const withReplies = node({ id: "c1", replies: [node({ id: "r1" })] });
    const result = await runRemoveCommentFlow(deps, {
      comments: [withReplies, node({ id: "c2" })],
      comment: withReplies,
      confirmed: true,
    });
    expect(deps.calls).toBe(1);
    expect(result).toEqual({ status: "removed", comments: [node({ id: "c2" })] });
  });

  it("surfaces the effect's error", async () => {
    const deps = fakeRemoveDeps({ ok: false, error: "Could not delete the comment. Try again." });
    const c = node({ id: "c1" });
    const result = await runRemoveCommentFlow(deps, { comments: [c], comment: c, confirmed: false });
    expect(result).toEqual({ status: "error", error: "Could not delete the comment. Try again." });
  });
});
