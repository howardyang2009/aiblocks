import { describe, it, expect } from "vitest";
import { postReview, deleteReview, type PostReviewDb, type DeleteReviewDb } from "@/lib/engagement/reviews";
import type { Tables } from "@/types/database";

function component(overrides: Partial<Tables<"components">> = {}): Tables<"components"> {
  return {
    id: "comp1",
    created_at: "",
    currency: "eur",
    description: "",
    download_count: 0,
    ecosystems: [],
    name: "Widget",
    price_cents: 500,
    readme: null,
    search_tsv: null,
    seller_id: "seller1",
    source_language: "en",
    slug: "widget",
    star_count: 0,
    status: "published",
    updated_at: "",
    zip_path: null,
    zip_size_bytes: null,
    ...overrides,
  };
}

type ReviewRow = Pick<Tables<"reviews">, "id" | "rating" | "body" | "created_at" | "updated_at">;

function fakeReviewsDb(opts: {
  component?: Tables<"components"> | null;
  owns?: boolean;
  upsert?: { data: ReviewRow | null; error: { message: string } | null };
}): PostReviewDb {
  return {
    from: (table: string) => {
      if (table === "components") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.component ?? null }) }) }) };
      }
      if (table === "downloads") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.owns ? { id: "d1" } : null }) }) }),
          }),
        };
      }
      if (table === "reviews") {
        return {
          upsert: () => ({
            select: () => ({
              single: async () =>
                opts.upsert ?? { data: { id: "r1", rating: 5, body: "nice", created_at: "", updated_at: "" }, error: null },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as PostReviewDb;
}

describe("postReview", () => {
  it("rejects a rating below 1", async () => {
    const db = fakeReviewsDb({ component: component(), owns: true });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 0, body: "" });
    expect(result).toEqual({ ok: false, status: 400, error: "ratingInvalid" });
  });

  it("rejects a rating above 5", async () => {
    const db = fakeReviewsDb({ component: component(), owns: true });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 6, body: "" });
    expect(result).toEqual({ ok: false, status: 400, error: "ratingInvalid" });
  });

  it("rejects a non-integer rating", async () => {
    const db = fakeReviewsDb({ component: component(), owns: true });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 3.5, body: "" });
    expect(result).toEqual({ ok: false, status: 400, error: "ratingInvalid" });
  });

  it("404s when the component doesn't exist or isn't published", async () => {
    const db = fakeReviewsDb({ component: null });
    const result = await postReview(db, { componentId: "missing", buyerId: "buyer1", rating: 5, body: "" });
    expect(result).toEqual({ ok: false, status: 404, error: "componentNotFound" });
  });

  it("rejects a seller reviewing their own component", async () => {
    const db = fakeReviewsDb({ component: component({ seller_id: "buyer1" }) });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 5, body: "" });
    expect(result).toEqual({ ok: false, status: 403, error: "ownReviewNotAllowed" });
  });

  it("rejects a buyer who hasn't downloaded the component", async () => {
    const db = fakeReviewsDb({ component: component(), owns: false });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 5, body: "" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "verifiedBuyerRequired",
    });
  });

  it("saves a review from a verified buyer", async () => {
    const db = fakeReviewsDb({ component: component(), owns: true });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 5, body: "great" });
    expect(result.ok).toBe(true);
  });

  it("500s when the upsert fails", async () => {
    const db = fakeReviewsDb({ component: component(), owns: true, upsert: { data: null, error: { message: "db down" } } });
    const result = await postReview(db, { componentId: "comp1", buyerId: "buyer1", rating: 5, body: "" });
    expect(result).toEqual({ ok: false, status: 500, error: "reviewSaveFailed" });
  });
});

describe("deleteReview", () => {
  it("succeeds when the delete has no error", async () => {
    const db: DeleteReviewDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }),
    };
    const result = await deleteReview(db, { componentId: "comp1", buyerId: "buyer1" });
    expect(result).toEqual({ ok: true });
  });

  it("500s when the delete errors", async () => {
    const db: DeleteReviewDb = {
      from: () => ({ delete: () => ({ eq: () => ({ eq: async () => ({ error: { message: "db down" } }) }) }) }),
    };
    const result = await deleteReview(db, { componentId: "comp1", buyerId: "buyer1" });
    expect(result).toEqual({ ok: false, status: 500, error: "reviewDeleteFailed" });
  });
});
