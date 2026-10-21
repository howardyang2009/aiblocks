import { describe, it, expect } from "vitest";
import { setStar, type SetStarDb } from "@/lib/engagement/stars";
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

// A fake whose stars table is a Set, and whose star_count follows it the
// way the trigger does.
function fakeStarsDb(opts: { component?: Tables<"components"> | null; starred?: string[]; writeError?: boolean } = {}) {
  const stars = new Set(opts.starred ?? []);
  const db = {
    from: (table: string) => {
      if (table === "components") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.component === null ? null : { ...(opts.component ?? component()), star_count: stars.size },
              }),
            }),
          }),
        };
      }
      const error = opts.writeError ? { message: "db down" } : null;
      return {
        upsert: async (row: { user_id: string }) => {
          if (!error) stars.add(row.user_id);
          return { error };
        },
        delete: () => ({
          eq: (_c: string, userId: string) => ({
            eq: async () => {
              if (!error) stars.delete(userId);
              return { error };
            },
          }),
        }),
      };
    },
  } as unknown as SetStarDb;
  return { db, stars };
}

describe("setStar", () => {
  it("404s with an error key when the Component isn't published", async () => {
    const { db } = fakeStarsDb({ component: null });
    expect(await setStar(db, { componentId: "comp1", userId: "u1", starred: true })).toEqual({
      ok: false,
      status: 404,
      error: "componentNotFound",
    });
  });

  it("stars and answers with the server's count", async () => {
    const { db } = fakeStarsDb({ starred: ["other"] });
    expect(await setStar(db, { componentId: "comp1", userId: "u1", starred: true })).toEqual({
      ok: true,
      starred: true,
      count: 2,
    });
  });

  it("is idempotent: starring twice stays starred", async () => {
    const { db } = fakeStarsDb();
    await setStar(db, { componentId: "comp1", userId: "u1", starred: true });
    expect(await setStar(db, { componentId: "comp1", userId: "u1", starred: true })).toEqual({
      ok: true,
      starred: true,
      count: 1,
    });
  });

  it("unstars, and unstarring again stays unstarred", async () => {
    const { db } = fakeStarsDb({ starred: ["u1"] });
    await setStar(db, { componentId: "comp1", userId: "u1", starred: false });
    expect(await setStar(db, { componentId: "comp1", userId: "u1", starred: false })).toEqual({
      ok: true,
      starred: false,
      count: 0,
    });
  });

  it("500s with an error key when the write fails", async () => {
    const { db } = fakeStarsDb({ writeError: true });
    expect(await setStar(db, { componentId: "comp1", userId: "u1", starred: true })).toEqual({
      ok: false,
      status: 500,
      error: "starSaveFailed",
    });
  });
});
