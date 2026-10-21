import { describe, it, expect } from "vitest";
import { buildComponentView, type ComponentRows } from "./view-model";
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

// `ratings` defaults to the listed Reviews' ratings: no unlisted Reviews.
function rows(overrides: Partial<ComponentRows> = {}): ComponentRows {
  return {
    component: component(),
    seller: { username: "seller", display_name: "Seller" },
    tags: [],
    reviewRows: [],
    ratings: (overrides.reviewRows ?? []).map((r) => r.rating),
    commentRows: [],
    reviewers: [],
    replyRows: [],
    commenters: [],
    ...overrides,
  };
}

describe("buildComponentView", () => {
  it("passes tags through unchanged", () => {
    const view = buildComponentView(rows({ tags: ["agent", "email"] }));
    expect(view.tags).toEqual(["agent", "email"]);
  });

  it("joins reviewer profiles and seller replies onto each review", () => {
    const view = buildComponentView(
      rows({
        reviewRows: [{ id: "r1", buyer_id: "buyer1", rating: 5, body: "great", created_at: "2026-01-01" }],
        reviewers: [{ id: "buyer1", username: "buyer", display_name: "Buyer One", avatar_url: null }],
        replyRows: [{ review_id: "r1", body: "thanks!", created_at: "2026-01-02" }],
      })
    );
    expect(view.reviews).toEqual([
      {
        id: "r1",
        rating: 5,
        body: "great",
        created_at: "2026-01-01",
        reviewer: { username: "buyer", display_name: "Buyer One", avatar_url: null },
        mine: false,
        reply: { body: "thanks!", created_at: "2026-01-02" },
      },
    ]);
  });

  it("computes review count and average rating", () => {
    const view = buildComponentView(
      rows({
        reviewRows: [
          { id: "r1", buyer_id: "b1", rating: 5, body: null, created_at: "" },
          { id: "r2", buyer_id: "b2", rating: 3, body: null, created_at: "" },
        ],
      })
    );
    expect(view.reviewCount).toBe(2);
    expect(view.avgRating).toBe(4);
  });

  it("reports a null average rating with no reviews", () => {
    const view = buildComponentView(rows({ reviewRows: [] }));
    expect(view.unloadedRatings).toEqual({ count: 0, sum: 0 });
    expect(view.reviewCount).toBe(0);
    expect(view.avgRating).toBeNull();
  });

  it("builds a one-level comment tree, nesting replies under their top-level parent", () => {
    const view = buildComponentView(
      rows({
        commentRows: [
          { id: "top1", user_id: "u1", parent_id: null, body: "question", created_at: "2026-01-01" },
          { id: "reply1", user_id: "seller1", parent_id: "top1", body: "answer", created_at: "2026-01-02" },
        ],
        commenters: [
          { id: "u1", username: "asker", display_name: null, avatar_url: null },
          { id: "seller1", username: "seller", display_name: "Seller", avatar_url: null },
        ],
        component: component({ seller_id: "seller1" }),
      })
    );
    expect(view.commentTree).toHaveLength(1);
    expect(view.commentTree[0].id).toBe("top1");
    expect(view.commentTree[0].replies).toHaveLength(1);
    expect(view.commentTree[0].replies[0].id).toBe("reply1");
    expect(view.commentTree[0].replies[0].isSeller).toBe(true);
  });

  it("counts and averages every Review, not just the listed ones", () => {
    const view = buildComponentView(
      rows({
        reviewRows: [{ id: "r1", buyer_id: "buyer1", rating: 5, body: null, created_at: "" }],
        ratings: [5, 1, 1, 1],
      })
    );
    expect(view.reviewCount).toBe(4);
    expect(view.avgRating).toBe(2);
    expect(view.unloadedRatings).toEqual({ count: 3, sum: 3 });
  });
});
