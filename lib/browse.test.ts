import { describe, it, expect, vi } from "vitest";
import {
  listPublishedComponents,
  listLatestPublished,
  listPublishedBySeller,
  listComponentsByIds,
  type ListComponentsDb,
  type ListByIdsDb,
} from "@/lib/browse";
import type { ComponentSummary } from "@/types/database";

function componentSummary(overrides: Partial<ComponentSummary> = {}): ComponentSummary {
  return {
    id: "c1",
    name: "Widget",
    description: "",
    ecosystems: [],
    price_cents: 0,
    currency: "usd",
    star_count: 0,
    download_count: 0,
    ...overrides,
  };
}

function fakeQuery(rows: ComponentSummary[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const query: Record<string, unknown> = {};
  const record = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
    return query;
  };
  query.eq = (...args: unknown[]) => record("eq", ...args);
  query.textSearch = (...args: unknown[]) => record("textSearch", ...args);
  query.in = (...args: unknown[]) => record("in", ...args);
  query.order = (...args: unknown[]) => record("order", ...args);
  query.limit = (...args: unknown[]) => record("limit", ...args);
  query.then = (resolve: (value: { data: ComponentSummary[]; error: null }) => void) =>
    Promise.resolve(resolve({ data: rows, error: null }));
  return { query, calls };
}

function fakeDb(opts: {
  rows?: ComponentSummary[];
  tag?: { id: string } | null;
  linkedComponentIds?: string[];
}) {
  const { query, calls } = fakeQuery(opts.rows ?? []);
  const db = {
    from: (table: string) => {
      if (table === "components") {
        return { select: () => ({ eq: () => query }) };
      }
      if (table === "tags") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.tag ?? null }) }) }) };
      }
      if (table === "component_tags") {
        return {
          select: () => ({
            eq: async () => ({ data: (opts.linkedComponentIds ?? []).map((id) => ({ component_id: id })) }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ListComponentsDb;
  return { db, calls };
}

describe("listPublishedComponents", () => {
  it("lists published components with no filters, defaulting to newest-first", async () => {
    const rows = [componentSummary()];
    const { db, calls } = fakeDb({ rows });

    const result = await listPublishedComponents(db, {});

    expect(result).toEqual({ components: rows, error: null });
    expect(calls.map((c) => c.method)).toEqual(["order", "limit"]);
    expect(calls[0].args).toEqual(["created_at", { ascending: false }]);
    expect(calls[1].args).toEqual([48]);
  });

  it("applies full-text search when q is given", async () => {
    const { db, calls } = fakeDb({});
    await listPublishedComponents(db, { q: "email agent" });

    expect(calls[0]).toEqual({ method: "textSearch", args: ["search_tsv", "email agent", { type: "websearch" }] });
  });

  it("sorts by downloads or stars when requested", async () => {
    const { db: db1, calls: calls1 } = fakeDb({});
    await listPublishedComponents(db1, { sort: "downloads" });
    expect(calls1[0].args).toEqual(["download_count", { ascending: false }]);

    const { db: db2, calls: calls2 } = fakeDb({});
    await listPublishedComponents(db2, { sort: "stars" });
    expect(calls2[0].args).toEqual(["star_count", { ascending: false }]);
  });

  it("filters by tag, resolving the tag name to component ids", async () => {
    const { db, calls } = fakeDb({ tag: { id: "tag1" }, linkedComponentIds: ["c1", "c2"] });
    await listPublishedComponents(db, { tag: "agent" });

    expect(calls[0]).toEqual({ method: "in", args: ["id", ["c1", "c2"]] });
  });

  it("matches nothing for an unknown tag, instead of matching everything", async () => {
    const { db, calls } = fakeDb({ tag: null });
    await listPublishedComponents(db, { tag: "ghost-tag" });

    expect(calls[0]).toEqual({ method: "in", args: ["id", ["00000000-0000-0000-0000-000000000000"]] });
  });

  it("matches nothing for a tag with no linked components", async () => {
    const { db, calls } = fakeDb({ tag: { id: "tag1" }, linkedComponentIds: [] });
    await listPublishedComponents(db, { tag: "unused" });

    expect(calls[0]).toEqual({ method: "in", args: ["id", ["00000000-0000-0000-0000-000000000000"]] });
  });

  it("surfaces the query error instead of throwing", async () => {
    const { query } = fakeQuery([]);
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data: null, error: { message: "db down" } }));
    const db = {
      from: () => ({ select: () => ({ eq: () => query }) }),
    } as unknown as ListComponentsDb;

    const result = await listPublishedComponents(db, {});
    expect(result).toEqual({ components: [], error: "db down" });
  });
});

describe("listLatestPublished", () => {
  it("orders by newest and applies the given limit", async () => {
    const rows = [componentSummary()];
    const { db, calls } = fakeDb({ rows });

    const result = await listLatestPublished(db, 6);

    expect(result).toEqual({ components: rows, error: null });
    expect(calls.map((c) => c.method)).toEqual(["order", "limit"]);
    expect(calls[0].args).toEqual(["created_at", { ascending: false }]);
    expect(calls[1].args).toEqual([6]);
  });

  it("surfaces the query error instead of throwing", async () => {
    const { query } = fakeQuery([]);
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data: null, error: { message: "db down" } }));
    const db = {
      from: () => ({ select: () => ({ eq: () => query }) }),
    } as unknown as ListComponentsDb;

    const result = await listLatestPublished(db, 6);
    expect(result).toEqual({ components: [], error: "db down" });
  });
});

describe("listPublishedBySeller", () => {
  it("filters to one seller's published components, newest first, with no limit", async () => {
    const rows = [componentSummary()];
    const { db, calls } = fakeDb({ rows });

    const result = await listPublishedBySeller(db, "seller1");

    expect(result).toEqual({ components: rows, error: null });
    expect(calls.map((c) => c.method)).toEqual(["eq", "order"]);
    expect(calls[0].args).toEqual(["seller_id", "seller1"]);
    expect(calls[1].args).toEqual(["created_at", { ascending: false }]);
  });

  it("surfaces the query error instead of throwing", async () => {
    const { query } = fakeQuery([]);
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data: null, error: { message: "db down" } }));
    const db = {
      from: () => ({ select: () => ({ eq: () => query }) }),
    } as unknown as ListComponentsDb;

    const result = await listPublishedBySeller(db, "seller1");
    expect(result).toEqual({ components: [], error: "db down" });
  });
});

function fakeByIdsDb(opts: { rows?: ComponentSummary[]; error?: { message: string } | null }) {
  const calls: string[][] = [];
  const db = {
    from: (table: string) => {
      if (table !== "components") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          in: async (column: string, values: string[]) => {
            calls.push(values);
            void column;
            return { data: opts.error ? null : opts.rows ?? [], error: opts.error ?? null };
          },
        }),
      };
    },
  } as unknown as ListByIdsDb;
  return { db, calls };
}

describe("listComponentsByIds", () => {
  it("returns nothing without querying when given no ids", async () => {
    const { db, calls } = fakeByIdsDb({ rows: [componentSummary()] });
    const result = await listComponentsByIds(db, []);
    expect(result).toEqual({ components: [], error: null });
    expect(calls).toEqual([]);
  });

  it("does not filter by status — a buyer keeps seeing what they own", async () => {
    const rows = [componentSummary({ id: "c1" })];
    const { db, calls } = fakeByIdsDb({ rows });
    await listComponentsByIds(db, ["c1"]);
    expect(calls).toEqual([["c1"]]);
  });

  it("returns results in the order the ids were given, not query order", async () => {
    const rows = [componentSummary({ id: "c2" }), componentSummary({ id: "c1" })];
    const { db } = fakeByIdsDb({ rows });

    const result = await listComponentsByIds(db, ["c1", "c2"]);

    expect(result.components.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("surfaces the query error instead of throwing", async () => {
    const { db } = fakeByIdsDb({ error: { message: "db down" } });
    const result = await listComponentsByIds(db, ["c1"]);
    expect(result).toEqual({ components: [], error: "db down" });
  });
});
