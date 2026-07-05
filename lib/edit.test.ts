import { describe, it, expect, vi } from "vitest";
import {
  parseEditInput,
  updateComponent,
  type UpdateComponentDb,
} from "@/lib/edit";

const validBody = {
  name: "Email Triage Agent",
  description: "Triages your inbox automatically",
  readme: "# Overview",
  price: "9.99",
  ecosystems: "claude, gpt",
  tags: "agent, email",
};

describe("parseEditInput", () => {
  it("accepts a valid submission WITHOUT a zip (keep-current path)", () => {
    const result = parseEditInput(validBody, "seller1");
    expect(result).toEqual({
      ok: true,
      data: {
        name: "Email Triage Agent",
        description: "Triages your inbox automatically",
        readme: "# Overview",
        priceCents: 999,
        ecosystems: ["claude", "gpt"],
        tagNames: ["agent", "email"],
        zipPath: undefined,
      },
    });
  });

  it("accepts a valid submission WITH a replacement zip", () => {
    const result = parseEditInput({ ...validBody, zipPath: "seller1/new.zip" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.zipPath).toBe("seller1/new.zip");
  });

  it("treats an empty-string zipPath as 'no replacement' (matches how the form serializes null)", () => {
    const result = parseEditInput({ ...validBody, zipPath: "" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.zipPath).toBeUndefined();
  });

  it("rejects a name under 3 characters", () => {
    const result = parseEditInput({ ...validBody, name: "ab" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Name must be at least 3 characters." });
  });

  it("rejects a description under 10 characters", () => {
    const result = parseEditInput({ ...validBody, description: "too short" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Add a short description (10+ characters)." });
  });

  it("rejects a negative price", () => {
    const result = parseEditInput({ ...validBody, price: "-5" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "Price must be 0 or a positive number." });
  });

  it("rejects a zip path outside the seller's namespace", () => {
    const result = parseEditInput({ ...validBody, zipPath: "someone-else/widget.zip" }, "seller1");
    expect(result).toEqual({ ok: false, status: 403, error: "Upload path mismatch." });
  });

  it("rounds dollars to integer cents", () => {
    const result = parseEditInput({ ...validBody, price: "0.005" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.priceCents).toBe(1);
  });
});

type FakeOpts = {
  existing?: { id: string; seller_id: string; zip_path: string | null } | null;
  updateError?: { message: string } | null;
  unlinkError?: { message: string } | null;
  upsertTags?: { data: { id: string; name: string }[] | null; error: { message: string } | null };
  insertLinks?: { error: { message: string } | null };
};

function fakeUpdateDb(opts: FakeOpts): UpdateComponentDb & {
  _componentUpdate: ReturnType<typeof vi.fn>;
  _tagLinkInsert: ReturnType<typeof vi.fn>;
  _tagLinkDelete: ReturnType<typeof vi.fn>;
} {
  const componentUpdate = vi.fn(async () => ({ error: opts.updateError ?? null }));
  const tagLinkDelete = vi.fn(async () => ({ error: opts.unlinkError ?? null }));
  const tagLinkInsert = vi.fn(async () => opts.insertLinks ?? { error: null });

  const db = {
    from: (table: string) => {
      if (table === "components") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.existing === undefined
                  ? { id: "comp1", seller_id: "seller1", zip_path: "seller1/old.zip" }
                  : opts.existing,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({ eq: componentUpdate }),
          }),
        };
      }
      if (table === "component_tags") {
        return {
          delete: () => ({ eq: tagLinkDelete }),
          insert: tagLinkInsert,
        };
      }
      if (table === "tags") {
        return {
          upsert: () => ({
            select: async () => opts.upsertTags ?? { data: [{ id: "tag1", name: "agent" }], error: null },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as UpdateComponentDb & {
    _componentUpdate: typeof componentUpdate;
    _tagLinkInsert: typeof tagLinkInsert;
    _tagLinkDelete: typeof tagLinkDelete;
  };

  db._componentUpdate = componentUpdate;
  db._tagLinkInsert = tagLinkInsert;
  db._tagLinkDelete = tagLinkDelete;
  return db;
}

const editArgs = {
  componentId: "comp1",
  sellerId: "seller1",
  name: "Widget",
  description: "A widget you can edit",
  readme: "",
  priceCents: 500,
  ecosystems: ["claude"],
  tagNames: ["agent"],
};

describe("updateComponent", () => {
  it("404s when the component doesn't exist", async () => {
    const db = fakeUpdateDb({ existing: null });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({ ok: false, status: 404, error: "Component not found." });
    // Nothing was written.
    expect(db._componentUpdate).not.toHaveBeenCalled();
    expect(db._tagLinkDelete).not.toHaveBeenCalled();
  });

  it("403s when the caller is not the seller", async () => {
    const db = fakeUpdateDb({
      existing: { id: "comp1", seller_id: "someone-else", zip_path: null },
    });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "You can only edit your own components.",
    });
    expect(db._componentUpdate).not.toHaveBeenCalled();
  });

  it("updates metadata and returns oldZipPath but no newZipPath when zip wasn't replaced", async () => {
    const db = fakeUpdateDb({});
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: true,
      id: "comp1",
      oldZipPath: "seller1/old.zip",
      newZipPath: null,
    });
    expect(db._componentUpdate).toHaveBeenCalledOnce();
  });

  it("updates zip_path and zip_size_bytes when a replacement zip is provided", async () => {
    const db = fakeUpdateDb({});
    const result = await updateComponent(db, {
      ...editArgs,
      zipPath: "seller1/new.zip",
      sizeBytes: 2048,
    });
    expect(result).toEqual({
      ok: true,
      id: "comp1",
      oldZipPath: "seller1/old.zip",
      newZipPath: "seller1/new.zip",
    });
  });

  it("wipes old tag links and inserts new ones", async () => {
    const db = fakeUpdateDb({});
    await updateComponent(db, editArgs);
    expect(db._tagLinkDelete).toHaveBeenCalledOnce();
    expect(db._tagLinkInsert).toHaveBeenCalledWith([
      { component_id: "comp1", tag_id: "tag1" },
    ]);
  });

  it("skips tag work entirely when tagNames is empty (but still wipes old links)", async () => {
    const db = fakeUpdateDb({});
    await updateComponent(db, { ...editArgs, tagNames: [] });
    // Old links still cleared — that's how a seller REMOVES all tags.
    expect(db._tagLinkDelete).toHaveBeenCalledOnce();
    expect(db._tagLinkInsert).not.toHaveBeenCalled();
  });

  it("fails when the components UPDATE returns an error", async () => {
    const db = fakeUpdateDb({ updateError: { message: "constraint" } });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({ ok: false, status: 500, error: "constraint" });
  });

  it("reports a visible partial failure when clearing old tags fails", async () => {
    const db = fakeUpdateDb({ unlinkError: { message: "fk violation" } });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Component updated, but clearing old tags failed.",
    });
  });

  it("reports a visible partial failure when linking new tags fails", async () => {
    const db = fakeUpdateDb({ insertLinks: { error: { message: "fk violation" } } });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Component updated, but linking tags failed.",
    });
  });
});
