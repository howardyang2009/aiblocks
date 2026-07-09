import { describe, it, expect } from "vitest";
import {
  buildCommentNode,
  insertComment,
  removeComment,
  requiresDeleteConfirmation,
  type CommentNode,
} from "@/lib/engagement/comments-section-state";
import type { PublicProfile } from "@/lib/identity/public-profile";

const viewer: PublicProfile = { username: "buyer1", display_name: "Buyer One", avatar_url: null };

function node(overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id: "c1",
    body: "hello",
    created_at: "2026-01-01T00:00:00Z",
    author: viewer,
    isSeller: false,
    mine: false,
    replies: [],
    ...overrides,
  };
}

describe("buildCommentNode", () => {
  it("builds a node from the server response and viewer context", () => {
    const result = buildCommentNode(
      { id: "c1", body: "Nice component!", created_at: "2026-01-01T00:00:00Z" },
      { viewer, isSeller: false }
    );
    expect(result).toEqual({
      id: "c1",
      body: "Nice component!",
      created_at: "2026-01-01T00:00:00Z",
      author: { username: "buyer1", display_name: "Buyer One", avatar_url: null },
      isSeller: false,
      mine: true,
      replies: [],
    });
  });

  it("badges the node as the seller's when isSeller is true", () => {
    const result = buildCommentNode(
      { id: "c1", body: "Thanks!", created_at: "2026-01-01T00:00:00Z" },
      { viewer, isSeller: true }
    );
    expect(result.isSeller).toBe(true);
  });

  it("falls back to a placeholder identity when viewer is null", () => {
    const result = buildCommentNode(
      { id: "c1", body: "hi", created_at: "2026-01-01T00:00:00Z" },
      { viewer: null, isSeller: false }
    );
    expect(result.author).toEqual({ username: "you", display_name: "You", avatar_url: null });
  });

  it("always marks a freshly-built node as mine, with no replies yet", () => {
    const result = buildCommentNode(
      { id: "c1", body: "hi", created_at: "2026-01-01T00:00:00Z" },
      { viewer, isSeller: false }
    );
    expect(result.mine).toBe(true);
    expect(result.replies).toEqual([]);
  });
});

describe("insertComment", () => {
  it("appends a top-level comment to the end (oldest first)", () => {
    const existing = node({ id: "top1" });
    const fresh = node({ id: "top2", mine: true });
    expect(insertComment([existing], fresh, null)).toEqual([existing, fresh]);
  });

  it("splices a reply into its parent's replies array", () => {
    const parent = node({ id: "top1" });
    const reply = node({ id: "r1", mine: true });
    expect(insertComment([parent], reply, "top1")).toEqual([{ ...parent, replies: [reply] }]);
  });

  it("leaves other top-level comments untouched when inserting a reply", () => {
    const parent = node({ id: "top1" });
    const other = node({ id: "top2" });
    const reply = node({ id: "r1", mine: true });
    const result = insertComment([parent, other], reply, "top1");
    expect(result[1]).toBe(other);
  });

  it("appends a second reply after the first, on the same parent", () => {
    const firstReply = node({ id: "r1" });
    const parent = node({ id: "top1", replies: [firstReply] });
    const secondReply = node({ id: "r2", mine: true });
    expect(insertComment([parent], secondReply, "top1")).toEqual([
      { ...parent, replies: [firstReply, secondReply] },
    ]);
  });
});

describe("removeComment", () => {
  it("removes a top-level comment", () => {
    const a = node({ id: "a" });
    const b = node({ id: "b" });
    expect(removeComment([a, b], "a")).toEqual([b]);
  });

  it("removing a top-level comment also drops it (and its replies) from the list — mirrors ON DELETE CASCADE", () => {
    const reply = node({ id: "r1" });
    const parent = node({ id: "p1", replies: [reply] });
    expect(removeComment([parent], "p1")).toEqual([]);
  });

  it("removes a reply from its parent's replies without otherwise touching the parent", () => {
    const reply = node({ id: "r1" });
    const parent = node({ id: "p1", replies: [reply] });
    expect(removeComment([parent], "r1")).toEqual([{ ...parent, replies: [] }]);
  });
});

describe("requiresDeleteConfirmation", () => {
  it("requires confirmation for a top-level comment with replies", () => {
    const reply = node({ id: "r1" });
    const parent = node({ id: "p1", replies: [reply] });
    expect(requiresDeleteConfirmation(parent)).toBe(true);
  });

  it("does not require confirmation for a childless top-level comment", () => {
    expect(requiresDeleteConfirmation(node({ id: "p1", replies: [] }))).toBe(false);
  });

  it("does not require confirmation for a reply (replies can't have replies of their own)", () => {
    expect(requiresDeleteConfirmation(node({ id: "r1", replies: [] }))).toBe(false);
  });
});
