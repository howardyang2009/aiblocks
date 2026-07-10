import { describe, it, expect } from "vitest";
import { toggleStar, type ToggleStarDb } from "@/lib/engagement/stars";
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

function fakeStarsDb(opts: {
  component?: Tables<"components"> | null;
  existingStar?: boolean;
  deleteError?: { message: string } | null;
  insertError?: { message: string } | null;
}): ToggleStarDb {
  return {
    from: (table: string) => {
      if (table === "components") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.component ?? null }) }) }) };
      }
      if (table === "stars") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: opts.existingStar ? { user_id: "u1" } : null }) }),
            }),
          }),
          delete: () => ({ eq: () => ({ eq: async () => ({ error: opts.deleteError ?? null }) }) }),
          insert: async () => ({ error: opts.insertError ?? null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ToggleStarDb;
}

describe("toggleStar", () => {
  it("404s when the component doesn't exist or isn't published", async () => {
    const db = fakeStarsDb({ component: null });
    const result = await toggleStar(db, { componentId: "missing", userId: "u1" });
    expect(result).toEqual({ ok: false, status: 404, error: "Component not found." });
  });

  it("adds a star when none exists", async () => {
    const db = fakeStarsDb({ component: component(), existingStar: false });
    const result = await toggleStar(db, { componentId: "comp1", userId: "u1" });
    expect(result).toEqual({ ok: true, starred: true });
  });

  it("removes a star when one already exists", async () => {
    const db = fakeStarsDb({ component: component(), existingStar: true });
    const result = await toggleStar(db, { componentId: "comp1", userId: "u1" });
    expect(result).toEqual({ ok: true, starred: false });
  });

  it("500s when adding the star fails", async () => {
    const db = fakeStarsDb({ component: component(), existingStar: false, insertError: { message: "db down" } });
    const result = await toggleStar(db, { componentId: "comp1", userId: "u1" });
    expect(result).toEqual({ ok: false, status: 500, error: "Failed to add star." });
  });

  it("500s when removing the star fails", async () => {
    const db = fakeStarsDb({ component: component(), existingStar: true, deleteError: { message: "db down" } });
    const result = await toggleStar(db, { componentId: "comp1", userId: "u1" });
    expect(result).toEqual({ ok: false, status: 500, error: "Failed to remove star." });
  });
});
