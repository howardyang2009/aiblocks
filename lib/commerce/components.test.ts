import { describe, it, expect, vi } from "vitest";
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

function fakeTagsDb(opts: {
  tagIdRows: { tag_id: string }[] | null;
  tagNameRows?: { name: string }[] | null;
}): ComponentTagsDb & { _tagsSelect: ReturnType<typeof vi.fn> } {
  const tagsSelect = vi.fn(() => ({
    in: async () => ({ data: opts.tagNameRows ?? [] }),
  }));
  const db = {
    from: (table: string) => {
      if (table === "component_tags") {
        return { select: () => ({ eq: async () => ({ data: opts.tagIdRows }) }) };
      }
      if (table === "tags") {
        return { select: tagsSelect };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ComponentTagsDb & { _tagsSelect: typeof tagsSelect };
  db._tagsSelect = tagsSelect;
  return db;
}

describe("getComponentTagNames", () => {
  it("returns the tag names for a component with tags", async () => {
    const db = fakeTagsDb({
      tagIdRows: [{ tag_id: "t1" }, { tag_id: "t2" }],
      tagNameRows: [{ name: "agent" }, { name: "email" }],
    });
    const result = await getComponentTagNames(db, "c1");
    expect(result).toEqual(["agent", "email"]);
  });

  it("returns an empty array without querying tag names when the component has no tags", async () => {
    const db = fakeTagsDb({ tagIdRows: [] });
    const result = await getComponentTagNames(db, "c1");
    expect(result).toEqual([]);
    expect(db._tagsSelect).not.toHaveBeenCalled();
  });

  it("returns an empty array when the component_tags query returns no rows", async () => {
    const db = fakeTagsDb({ tagIdRows: null });
    const result = await getComponentTagNames(db, "c1");
    expect(result).toEqual([]);
  });
});
