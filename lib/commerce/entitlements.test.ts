import { describe, it, expect } from "vitest";
import {
  getEntitlement,
  listEntitlements,
  grantEntitlement,
  type DownloadLookupDb,
  type DownloadListDb,
  type DownloadGrantDb,
} from "@/lib/commerce/entitlements";

describe("getEntitlement", () => {
  it("is true when a downloads row exists", async () => {
    const db: DownloadLookupDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "d1" } }),
            }),
          }),
        }),
      }),
    };
    expect(await getEntitlement(db, "user1", "comp1")).toBe(true);
  });

  it("is false when no downloads row exists", async () => {
    const db: DownloadLookupDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    };
    expect(await getEntitlement(db, "user1", "comp1")).toBe(false);
  });
});

describe("listEntitlements", () => {
  it("returns the rows newest-first as given by the query", async () => {
    const rows = [
      { component_id: "c2", acquired_at: "2026-02-01" },
      { component_id: "c1", acquired_at: "2026-01-01" },
    ];
    const db: DownloadListDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: rows }),
          }),
        }),
      }),
    };
    expect(await listEntitlements(db, "user1")).toEqual(rows);
  });

  it("returns an empty array when the query has no data", async () => {
    const db: DownloadListDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null }),
          }),
        }),
      }),
    };
    expect(await listEntitlements(db, "user1")).toEqual([]);
  });
});

describe("grantEntitlement", () => {
  it("upserts idempotently and reports no error on success", async () => {
    const calls: unknown[] = [];
    const db: DownloadGrantDb = {
      from: () => ({
        upsert: async (row, opts) => {
          calls.push({ row, opts });
          return { error: null };
        },
      }),
    };
    const result = await grantEntitlement(db, { userId: "u1", componentId: "c1", purchaseId: "p1" });
    expect(result).toEqual({ error: null });
    expect(calls).toEqual([
      {
        row: { user_id: "u1", component_id: "c1", purchase_id: "p1" },
        opts: { onConflict: "user_id,component_id", ignoreDuplicates: true },
      },
    ]);
  });

  it("defaults purchase_id to null for a free download", async () => {
    let inserted: { purchase_id: string | null } | undefined;
    const db: DownloadGrantDb = {
      from: () => ({
        upsert: async (row) => {
          inserted = row;
          return { error: null };
        },
      }),
    };
    await grantEntitlement(db, { userId: "u1", componentId: "c1" });
    expect(inserted?.purchase_id).toBeNull();
  });

  it("surfaces the error message on failure", async () => {
    const db: DownloadGrantDb = {
      from: () => ({
        upsert: async () => ({ error: { message: "constraint violation" } }),
      }),
    };
    const result = await grantEntitlement(db, { userId: "u1", componentId: "c1" });
    expect(result).toEqual({ error: "constraint violation" });
  });
});
