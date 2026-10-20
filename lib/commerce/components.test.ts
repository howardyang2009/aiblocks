import { describe, it, expect } from "vitest";
import { getPublishedComponent, getComponentTagNames, type PublishedComponentDb, type ComponentTagsDb } from "@/lib/commerce/components";
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
    currency: "eur",
    description: "",
    download_count: 0,
    ecosystems: [],
    name: "Widget",
    price_cents: 0,
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

function fakeTagsDb(rows: { tags: { name: string } | null }[] | null) {
  const calls: { columns: string; filter: unknown[] }[] = [];
  const db = {
    from: (table: string) => {
      if (table !== "component_tags") throw new Error(`unexpected table ${table}`);
      return {
        select: (columns: string) => ({
          eq: async (...filter: unknown[]) => {
            calls.push({ columns, filter });
            return { data: rows };
          },
        }),
      };
    },
  } as unknown as ComponentTagsDb;
  return { db, calls };
}

describe("getComponentTagNames", () => {
  it("returns the tag names for a component in one query, embedding the tag via its FK", async () => {
    const { db, calls } = fakeTagsDb([{ tags: { name: "agent" } }, { tags: { name: "email" } }]);
    const result = await getComponentTagNames(db, "c1");
    expect(result).toEqual(["agent", "email"]);
    expect(calls).toEqual([{ columns: "tags!inner(name)", filter: ["component_id", "c1"] }]);
  });

  it("returns an empty array when the component has no tags", async () => {
    const { db } = fakeTagsDb([]);
    expect(await getComponentTagNames(db, "c1")).toEqual([]);
  });

  it("returns an empty array when the query returns no rows", async () => {
    const { db } = fakeTagsDb(null);
    expect(await getComponentTagNames(db, "c1")).toEqual([]);
  });
});
