import { describe, it, expect, vi } from "vitest";
import {
  buildCommentTree,
  postComment,
  deleteComment,
  insertComment,
  removeComment,
  requiresDeleteConfirmation,
  type CommentNode,
} from "@/lib/engagement/comment-thread";
import type { PublicProfile } from "@/lib/identity/public-profile";

const author: PublicProfile = { username: "alice", display_name: "Alice", avatar_url: null };
const viewer: PublicProfile = { username: "bob", display_name: "Bob", avatar_url: null };
const messages = { fallback: "failed", network: "offline", required: "required" };

function node(overrides: Partial<CommentNode> = {}): CommentNode {
  return { id: "c1", body: "hello", created_at: "2026-01-01", author, isSeller: false, mine: false, replies: [], ...overrides };
}

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status })
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("buildCommentTree", () => {
  it("nests replies under their parent and marks seller and viewer", () => {
    const tree = buildCommentTree(
      [
        { id: "a", user_id: "u1", parent_id: null, body: "q", created_at: "1" },
        { id: "b", user_id: "seller", parent_id: "a", body: "answer", created_at: "2" },
        { id: "c", user_id: "me", parent_id: null, body: "mine", created_at: "3" },
      ],
      {
        authors: [{ id: "u1", username: "alice", display_name: "Alice", avatar_url: null }],
        sellerId: "seller",
        viewerId: "me",
      }
    );
    expect(tree.map((n) => n.id)).toEqual(["a", "c"]);
    expect(tree[0].author.username).toBe("alice");
    expect(tree[0].replies.map((r) => [r.id, r.isSeller, r.author.username])).toEqual([["b", true, "unknown"]]);
    expect(tree[1].mine).toBe(true);
    expect(tree[0].mine).toBe(false);
  });

  it("marks nothing as mine for a signed-out viewer", () => {
    const tree = buildCommentTree([{ id: "a", user_id: "u1", parent_id: null, body: "q", created_at: "1" }], {
      authors: [],
      sellerId: "s",
      viewerId: null,
    });
    expect(tree[0].mine).toBe(false);
  });
});

describe("tree transitions", () => {
  it("inserts a top-level Comment at the end and a reply under its parent", () => {
    const thread = [node({ id: "a" }), node({ id: "b" })];
    expect(insertComment(thread, node({ id: "x" }), null).map((c) => c.id)).toEqual(["a", "b", "x"]);
    expect(insertComment(thread, node({ id: "r" }), "a")[0].replies.map((r) => r.id)).toEqual(["r"]);
  });

  it("removes a Comment wherever it lives", () => {
    const thread = [node({ id: "a", replies: [node({ id: "r" })] }), node({ id: "b" })];
    expect(removeComment(thread, "b").map((c) => c.id)).toEqual(["a"]);
    expect(removeComment(thread, "r")[0].replies).toEqual([]);
  });

  it("asks for confirmation only when replies would cascade", () => {
    expect(requiresDeleteConfirmation(node())).toBe(false);
    expect(requiresDeleteConfirmation(node({ replies: [node({ id: "r" })] }))).toBe(true);
  });
});

describe("postComment", () => {
  const args = { componentId: "comp1", body: "  hi  ", parentId: null, viewer, isSeller: false };

  it("rejects a blank body without a request", async () => {
    const fetch = fakeFetch(200, {});
    expect(await postComment({ fetch, messages }, { ...args, body: "   " })).toEqual({ status: "error", error: "required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts the trimmed body and inserts the new node as the viewer's own", async () => {
    const fetch = fakeFetch(200, { id: "new", body: "hi", created_at: "2026-02-01" });
    const result = await postComment({ fetch, messages }, args);
    expect(fetch.mock.calls[0][0]).toBe("/api/components/comp1/comments");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ body: "hi", parentId: null });
    if (result.status !== "posted") throw new Error("expected posted");
    const [added] = result.apply([]);
    expect(added).toMatchObject({ id: "new", body: "hi", author: viewer, mine: true, replies: [] });
  });

  it("forwards the server error", async () => {
    const result = await postComment({ fetch: fakeFetch(400, { error: "bodyTooLong" }), messages }, args);
    expect(result).toEqual({ status: "error", error: "bodyTooLong" });
  });
});

describe("deleteComment", () => {
  it("does nothing when the cascade confirmation is declined", async () => {
    const fetch = fakeFetch(200, {});
    const result = await deleteComment(
      { fetch, confirm: () => false, messages },
      node({ replies: [node({ id: "r" })] })
    );
    expect(result).toEqual({ status: "cancelled" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never asks to confirm a Comment without replies", async () => {
    const confirm = vi.fn(() => false);
    const result = await deleteComment({ fetch: fakeFetch(200, {}), confirm, messages }, node());
    expect(result.status).toBe("removed");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("forwards the server error", async () => {
    const result = await deleteComment({ fetch: fakeFetch(403, { error: "forbidden" }), confirm: () => true, messages }, node());
    expect(result).toEqual({ status: "error", error: "forbidden" });
  });
});

describe("concurrent requests", () => {
  // Delete X is sent, then Y is posted before the delete settles. Each
  // result must apply to the latest thread, so X stays gone and Y stays.
  it("keeps both results whichever settles last", async () => {
    let thread = [node({ id: "x", mine: true })];
    const setThread = (apply: (t: CommentNode[]) => CommentNode[]) => (thread = apply(thread));

    const removed = await deleteComment({ fetch: fakeFetch(200, {}), confirm: () => true, messages }, thread[0]);
    const posted = await postComment(
      { fetch: fakeFetch(200, { id: "y", body: "y", created_at: "2" }), messages },
      { componentId: "c", body: "y", parentId: null, viewer, isSeller: false }
    );
    if (removed.status !== "removed" || posted.status !== "posted") throw new Error("setup");

    setThread(removed.apply);
    setThread(posted.apply);
    expect(thread.map((c) => c.id)).toEqual(["y"]);
  });
});
