import { describe, it, expect } from "vitest";
import { postReply, deleteReply, type PostReplyDb, type DeleteReplyDb } from "@/lib/engagement/replies";
import type { Tables } from "@/types/database";

type ReviewLookup = Pick<Tables<"reviews">, "id" | "component_id">;
type ComponentLookup = Pick<Tables<"components">, "id" | "seller_id">;
type ReplyRow = Pick<Tables<"review_replies">, "id" | "body" | "created_at" | "updated_at">;

function fakeRepliesDb(opts: {
  review?: ReviewLookup | null;
  component?: ComponentLookup | null;
  upsert?: { data: ReplyRow | null; error: { message: string } | null };
}): PostReplyDb {
  return {
    from: (table: string) => {
      if (table === "reviews") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.review ?? null }) }) }) };
      }
      if (table === "components") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.component ?? null }) }) }) };
      }
      if (table === "review_replies") {
        return {
          upsert: () => ({
            select: () => ({
              single: async () =>
                opts.upsert ?? { data: { id: "reply1", body: "thanks", created_at: "", updated_at: "" }, error: null },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as PostReplyDb;
}

describe("postReply", () => {
  it("rejects an empty body", async () => {
    const db = fakeRepliesDb({});
    const result = await postReply(db, { reviewId: "r1", sellerId: "seller1", body: "" });
    expect(result).toEqual({ ok: false, status: 400, error: "Reply text is required." });
  });

  it("404s when the review doesn't exist", async () => {
    const db = fakeRepliesDb({ review: null });
    const result = await postReply(db, { reviewId: "missing", sellerId: "seller1", body: "thanks" });
    expect(result).toEqual({ ok: false, status: 404, error: "Review not found." });
  });

  it("rejects a non-seller replying", async () => {
    const db = fakeRepliesDb({
      review: { id: "r1", component_id: "comp1" },
      component: { id: "comp1", seller_id: "someone-else" },
    });
    const result = await postReply(db, { reviewId: "r1", sellerId: "seller1", body: "thanks" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Only the seller of this component can reply to its reviews.",
    });
  });

  it("saves a reply from the component's seller", async () => {
    const db = fakeRepliesDb({
      review: { id: "r1", component_id: "comp1" },
      component: { id: "comp1", seller_id: "seller1" },
    });
    const result = await postReply(db, { reviewId: "r1", sellerId: "seller1", body: "thanks" });
    expect(result.ok).toBe(true);
  });

  it("500s when the upsert fails", async () => {
    const db = fakeRepliesDb({
      review: { id: "r1", component_id: "comp1" },
      component: { id: "comp1", seller_id: "seller1" },
      upsert: { data: null, error: { message: "db down" } },
    });
    const result = await postReply(db, { reviewId: "r1", sellerId: "seller1", body: "thanks" });
    expect(result).toEqual({ ok: false, status: 500, error: "Could not save the reply. Try again." });
  });
});

describe("deleteReply", () => {
  it("succeeds when the delete has no error", async () => {
    const db: DeleteReplyDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }),
    };
    const result = await deleteReply(db, { reviewId: "r1", sellerId: "seller1" });
    expect(result).toEqual({ ok: true });
  });

  it("500s when the delete errors", async () => {
    const db: DeleteReplyDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: { message: "db down" } }) }) }) }),
    };
    const result = await deleteReply(db, { reviewId: "r1", sellerId: "seller1" });
    expect(result).toEqual({ ok: false, status: 500, error: "Could not delete the reply. Try again." });
  });
});
