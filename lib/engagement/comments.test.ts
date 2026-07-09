import { describe, it, expect, vi } from "vitest";
import { postComment, deleteComment, type PostCommentDb, type DeleteCommentDb } from "@/lib/engagement/comments";
import type { Tables } from "@/types/database";

function component(overrides: Partial<Tables<"components">> = {}): Tables<"components"> {
  return {
    id: "comp1",
    created_at: "",
    currency: "usd",
    description: "",
    download_count: 0,
    ecosystems: [],
    name: "Widget",
    price_cents: 0,
    readme: null,
    search_tsv: null,
    seller_id: "seller1",
    slug: "widget",
    star_count: 0,
    status: "published",
    updated_at: "",
    zip_path: null,
    zip_size_bytes: null,
    ...overrides,
  };
}

type CommentInsert = { data: Pick<Tables<"comments">, "id" | "parent_id" | "body" | "created_at"> | null; error: { message: string } | null };
type ParentRow = Pick<Tables<"comments">, "id" | "component_id" | "parent_id">;

function fakeCommentsDb(opts: {
  component?: Tables<"components"> | null;
  parent?: ParentRow | null;
  insert?: CommentInsert;
}) {
  const insert = vi.fn(async () => opts.insert ?? { data: { id: "comment1", parent_id: null, body: "hi", created_at: "" }, error: null });
  const db = {
    from: (table: string) => {
      if (table === "components") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.component ?? null }) }) }) };
      }
      if (table === "comments") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.parent ?? null }) }) }),
          insert: () => ({ select: () => ({ single: insert }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as PostCommentDb;
  return { db, insert };
}

describe("postComment", () => {
  it("rejects an empty body", async () => {
    const { db } = fakeCommentsDb({ component: component() });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "", parentId: null });
    expect(result).toEqual({ ok: false, status: 400, error: "Comment text is required." });
  });

  it("404s when the component doesn't exist or isn't published", async () => {
    const { db } = fakeCommentsDb({ component: null });
    const result = await postComment(db, { componentId: "missing", userId: "u1", body: "hi", parentId: null });
    expect(result).toEqual({ ok: false, status: 404, error: "Component not found." });
  });

  it("posts a top-level comment", async () => {
    const { db } = fakeCommentsDb({ component: component() });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: null });
    expect(result.ok).toBe(true);
  });

  it("404s replying to a parent that doesn't exist", async () => {
    const { db } = fakeCommentsDb({ component: component(), parent: null });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: "ghost" });
    expect(result).toEqual({ ok: false, status: 404, error: "Comment to reply to was not found." });
  });

  it("404s replying to a parent on a different component", async () => {
    const { db } = fakeCommentsDb({
      component: component(),
      parent: { id: "p1", component_id: "other-comp", parent_id: null },
    });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: "p1" });
    expect(result).toEqual({ ok: false, status: 404, error: "Comment to reply to was not found." });
  });

  it("rejects a reply to a reply (depth > 1)", async () => {
    const { db } = fakeCommentsDb({
      component: component(),
      parent: { id: "p1", component_id: "comp1", parent_id: "top1" },
    });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: "p1" });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Replies can only be added to top-level comments.",
    });
  });

  it("posts a valid reply to a top-level comment", async () => {
    const { db, insert } = fakeCommentsDb({
      component: component(),
      parent: { id: "p1", component_id: "comp1", parent_id: null },
    });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: "p1" });
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalled();
  });

  it("500s when the insert fails", async () => {
    const { db } = fakeCommentsDb({ component: component(), insert: { data: null, error: { message: "db down" } } });
    const result = await postComment(db, { componentId: "comp1", userId: "u1", body: "hi", parentId: null });
    expect(result).toEqual({ ok: false, status: 500, error: "Could not post the comment. Try again." });
  });
});

describe("deleteComment", () => {
  it("succeeds when the delete has no error", async () => {
    const db: DeleteCommentDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }),
    };
    const result = await deleteComment(db, { commentId: "c1", userId: "u1" });
    expect(result).toEqual({ ok: true });
  });

  it("500s when the delete errors", async () => {
    const db: DeleteCommentDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: { message: "db down" } }) }) }) }),
    };
    const result = await deleteComment(db, { commentId: "c1", userId: "u1" });
    expect(result).toEqual({ ok: false, status: 500, error: "Could not delete the comment. Try again." });
  });
});
