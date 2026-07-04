import { describe, it, expect } from "vitest";
import { buildComponentView, type ComponentRows } from "./view-model";
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
    price_cents: 500,
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

function profile(overrides: Partial<Tables<"profiles">> = {}): Tables<"profiles"> {
  return {
    avatar_url: null,
    bio: null,
    clerk_user_id: "",
    created_at: "",
    display_name: null,
    github_url: null,
    id: "buyer1",
    stripe_account_id: null,
    stripe_onboarding_done: false,
    twitter_url: null,
    updated_at: "",
    username: "buyer",
    website_url: null,
    ...overrides,
  };
}

function rows(overrides: Partial<ComponentRows> = {}): ComponentRows {
  return {
    component: component(),
    seller: { username: "seller", display_name: "Seller" },
    tagRows: [],
    reviewRows: [],
    commentRows: [],
    starRow: null,
    owned: false,
    reviewers: [],
    replyRows: [],
    commenters: [],
    ...overrides,
  };
}

describe("buildComponentView", () => {
  it("maps tag rows to plain tag names", () => {
    const view = buildComponentView(rows({ tagRows: [{ name: "agent" }, { name: "email" }] }), null);
    expect(view.tags).toEqual(["agent", "email"]);
  });

  it("marks starred true only when a star row exists", () => {
    const notStarred = buildComponentView(rows({ starRow: null }), null);
    expect(notStarred.starred).toBe(false);
    const starred = buildComponentView(rows({ starRow: { user_id: "u1" } }), null);
    expect(starred.starred).toBe(true);
  });

  it("marks isSeller only when the viewer's profile id matches the component's seller_id", () => {
    const viewer = profile({ id: "seller1" });
    const view = buildComponentView(rows({ component: component({ seller_id: "seller1" }) }), viewer);
    expect(view.isSeller).toBe(true);

    const otherViewer = profile({ id: "someone-else" });
    const view2 = buildComponentView(rows({ component: component({ seller_id: "seller1" }) }), otherViewer);
    expect(view2.isSeller).toBe(false);
  });

  it("is never the seller when signed out", () => {
    const view = buildComponentView(rows({ component: component({ seller_id: "seller1" }) }), null);
    expect(view.isSeller).toBe(false);
  });

  it("joins reviewer profiles and seller replies onto each review", () => {
    const view = buildComponentView(
      rows({
        reviewRows: [{ id: "r1", buyer_id: "buyer1", rating: 5, body: "great", created_at: "2026-01-01" }],
        reviewers: [{ id: "buyer1", username: "buyer", display_name: "Buyer One", avatar_url: null }],
        replyRows: [{ review_id: "r1", body: "thanks!", created_at: "2026-01-02" }],
      }),
      null
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

  it("marks a review as mine when the viewer is the reviewer", () => {
    const viewer = profile({ id: "buyer1" });
    const view = buildComponentView(
      rows({ reviewRows: [{ id: "r1", buyer_id: "buyer1", rating: 4, body: null, created_at: "" }] }),
      viewer
    );
    expect(view.reviews[0].mine).toBe(true);
  });

  it("computes review count and average rating", () => {
    const view = buildComponentView(
      rows({
        reviewRows: [
          { id: "r1", buyer_id: "b1", rating: 5, body: null, created_at: "" },
          { id: "r2", buyer_id: "b2", rating: 3, body: null, created_at: "" },
        ],
      }),
      null
    );
    expect(view.reviewCount).toBe(2);
    expect(view.avgRating).toBe(4);
  });

  it("reports a null average rating with no reviews", () => {
    const view = buildComponentView(rows({ reviewRows: [] }), null);
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
      }),
      null
    );
    expect(view.commentTree).toHaveLength(1);
    expect(view.commentTree[0].id).toBe("top1");
    expect(view.commentTree[0].replies).toHaveLength(1);
    expect(view.commentTree[0].replies[0].id).toBe("reply1");
    expect(view.commentTree[0].replies[0].isSeller).toBe(true);
  });

  it("returns no viewer public profile when signed out", () => {
    const view = buildComponentView(rows(), null);
    expect(view.viewer).toBeNull();
  });
});
