import { describe, it, expect } from "vitest";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/components";
import type { Tables } from "@/types/database";

function fakeDb(component: Tables<"components"> | null): PublishedComponentDb {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: component }),
        }),
      }),
    }),
  };
}

function component(overrides: Partial<Tables<"components">> = {}): Tables<"components"> {
  return {
    id: "c1",
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

describe("getPublishedComponent", () => {
  it("returns the row when published", async () => {
    const row = component();
    const result = await getPublishedComponent(fakeDb(row), "c1");
    expect(result).toEqual(row);
  });

  it("returns null when the component doesn't exist", async () => {
    const result = await getPublishedComponent(fakeDb(null), "missing");
    expect(result).toBeNull();
  });

  it("returns null when the component exists but isn't published", async () => {
    const row = component({ status: "draft" });
    const result = await getPublishedComponent(fakeDb(row), "c1");
    expect(result).toBeNull();
  });
});
