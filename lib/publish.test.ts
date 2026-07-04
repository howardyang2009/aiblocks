import { describe, it, expect, vi } from "vitest";
import { parsePublishInput, verifyUploadedZip, publishComponent } from "@/lib/publish";
import type { createServiceClient } from "@/lib/supabase/server";

const validBody = {
  name: "Email Triage Agent",
  description: "Triages your inbox automatically",
  readme: "# Overview",
  zipPath: "seller1/widget.zip",
  price: "9.99",
  ecosystems: "claude, gpt",
  tags: "agent, email",
};

describe("parsePublishInput", () => {
  it("accepts a valid submission and shapes it", () => {
    const result = parsePublishInput(validBody, "seller1");
    expect(result).toEqual({
      ok: true,
      data: {
        name: "Email Triage Agent",
        description: "Triages your inbox automatically",
        readme: "# Overview",
        zipPath: "seller1/widget.zip",
        priceCents: 999,
        ecosystems: ["claude", "gpt"],
        tagNames: ["agent", "email"],
      },
    });
  });

  it("rejects a name under 3 characters", () => {
    const result = parsePublishInput({ ...validBody, name: "ab" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Name must be at least 3 characters." });
  });

  it("rejects a description under 10 characters", () => {
    const result = parsePublishInput({ ...validBody, description: "too short" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Add a short description (10+ characters)." });
  });

  it("rejects a missing zip path", () => {
    const result = parsePublishInput({ ...validBody, zipPath: "" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Upload a zip before publishing." });
  });

  it("rejects a zip path outside the seller's namespace", () => {
    const result = parsePublishInput({ ...validBody, zipPath: "someone-else/widget.zip" }, "seller1");
    expect(result).toEqual({ ok: false, status: 403, error: "Upload path mismatch." });
  });

  it("rejects a negative price", () => {
    const result = parsePublishInput({ ...validBody, price: "-5" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Price must be 0 or a positive number." });
  });

  it("rejects a non-numeric price", () => {
    const result = parsePublishInput({ ...validBody, price: "free plz" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Price must be 0 or a positive number." });
  });

  it("rounds dollars to integer cents", () => {
    const result = parsePublishInput({ ...validBody, price: "0.005" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.priceCents).toBe(1);
  });
});

function fakeStorageDb(opts: {
  listed?: { name: string; metadata?: { size?: number } }[] | null;
  removeError?: { message: string } | null;
}) {
  const remove = vi.fn(async () => ({ error: opts.removeError ?? null }));
  return {
    storage: {
      from: () => ({
        list: async () => ({ data: opts.listed ?? null }),
        remove,
      }),
    },
    _remove: remove,
  } as unknown as ReturnType<typeof createServiceClient> & { _remove: typeof remove };
}

describe("verifyUploadedZip", () => {
  it("rejects when the uploaded object can't be found", async () => {
    const db = fakeStorageDb({ listed: [] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: false, status: 400, error: "Uploaded file not found. Try again." });
  });

  it("accepts a file within the size limit", async () => {
    const db = fakeStorageDb({ listed: [{ name: "widget.zip", metadata: { size: 1024 } }] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: true, sizeBytes: 1024 });
  });

  it("rejects and cleans up a file over the size limit", async () => {
    const db = fakeStorageDb({ listed: [{ name: "widget.zip", metadata: { size: 20 * 1024 * 1024 } }] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: false, status: 413, error: "Zip exceeds the 10MB limit." });
    expect(db._remove).toHaveBeenCalledWith(["seller1/widget.zip"]);
  });
});

function fakePublishDb(opts: {
  insertComponent?: { data: { id: string } | null; error: { message: string } | null };
  upsertTags?: { data: { id: string; name: string }[] | null; error: { message: string } | null };
  insertTagLinks?: { error: { message: string } | null };
}) {
  return {
    from: (table: string) => {
      if (table === "components") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => opts.insertComponent ?? { data: { id: "comp1" }, error: null },
            }),
          }),
        };
      }
      if (table === "tags") {
        return {
          upsert: () => ({
            select: async () => opts.upsertTags ?? { data: [], error: null },
          }),
        };
      }
      if (table === "component_tags") {
        return { insert: async () => opts.insertTagLinks ?? { error: null } };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as ReturnType<typeof createServiceClient>;
}

const publishArgs = {
  name: "Widget",
  description: "A widget",
  readme: "",
  zipPath: "seller1/widget.zip",
  priceCents: 500,
  ecosystems: ["claude"],
  tagNames: ["agent"],
  sellerId: "seller1",
  sizeBytes: 1024,
};

describe("publishComponent", () => {
  it("publishes with no tags", async () => {
    const db = fakePublishDb({});
    const result = await publishComponent(db, { ...publishArgs, tagNames: [] });
    expect(result.ok).toBe(true);
    expect(result.ok && result.id).toBe("comp1");
  });

  it("fails when the component insert fails", async () => {
    const db = fakePublishDb({ insertComponent: { data: null, error: { message: "constraint" } } });
    const result = await publishComponent(db, publishArgs);
    expect(result).toEqual({ ok: false, status: 500, error: "constraint" });
  });

  it("reports a visible failure when tag linking fails, without rolling back the component", async () => {
    const db = fakePublishDb({
      upsertTags: { data: [{ id: "tag1", name: "agent" }], error: null },
      insertTagLinks: { error: { message: "fk violation" } },
    });
    const result = await publishComponent(db, publishArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Component published, but linking tags failed.",
    });
  });

  it("reports a visible failure when saving tags fails", async () => {
    const db = fakePublishDb({ upsertTags: { data: null, error: { message: "db down" } } });
    const result = await publishComponent(db, publishArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Component published, but saving tags failed.",
    });
  });
});
