import { describe, it, expect, vi } from "vitest";
import {
  parsePublishInput,
  parseEditInput,
  verifyUploadedZip,
  publishComponent,
  updateComponent,
  createUploadUrl,
  isOwnedBySeller,
  type VerifyUploadedZipStorage,
  type PublishComponentDb,
  type UpdateComponentDb,
  type CreateUploadUrlStorage,
} from "@/lib/commerce/components-write";

const validPublishBody = {
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
    const result = parsePublishInput(validPublishBody, "seller1");
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
    const result = parsePublishInput({ ...validPublishBody, name: "ab" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "nameTooShort" });
  });

  it("rejects a description under 10 characters", () => {
    const result = parsePublishInput({ ...validPublishBody, description: "too short" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "descriptionTooShort" });
  });

  it("rejects a missing zip path", () => {
    const result = parsePublishInput({ ...validPublishBody, zipPath: "" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "zipRequired" });
  });

  it("rejects a zip path outside the seller's namespace", () => {
    const result = parsePublishInput({ ...validPublishBody, zipPath: "someone-else/widget.zip" }, "seller1");
    expect(result).toEqual({ ok: false, status: 403, error: "uploadPathMismatch" });
  });

  it("rejects a negative price", () => {
    const result = parsePublishInput({ ...validPublishBody, price: "-5" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "priceInvalid" });
  });

  it("rejects a non-numeric price", () => {
    const result = parsePublishInput({ ...validPublishBody, price: "free plz" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "priceInvalid" });
  });

  it.each([
    ["12.50", 1250],
    ["12,50", 1250],
    ["12", 1200],
    ["0,5", 50],
    [" 5 ", 500],
    ["0", 0],
  ])("accepts %j as euros and stores integer cents", (price, cents) => {
    const result = parsePublishInput({ ...validPublishBody, price }, "seller1");
    expect(result.ok && result.data.priceCents).toBe(cents);
  });

  it.each(["1,000.00", "1.000,50", "1,000", "1.000", "1 000", "0.005", "12.", ",5", "99999999"])(
    "rejects %j (thousands separator, more than two decimals, or too large)",
    (price) => {
      const result = parsePublishInput({ ...validPublishBody, price }, "seller1");
      expect(result).toEqual({ ok: false, status: 400, error: "priceInvalid" });
    }
  );
});

const validEditBody = {
  name: "Email Triage Agent",
  description: "Triages your inbox automatically",
  readme: "# Overview",
  price: "9.99",
  ecosystems: "claude, gpt",
  tags: "agent, email",
};

describe("parseEditInput", () => {
  it("accepts a valid submission WITHOUT a zip (keep-current path)", () => {
    const result = parseEditInput(validEditBody, "seller1");
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
    const result = parseEditInput({ ...validEditBody, zipPath: "seller1/new.zip" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.zipPath).toBe("seller1/new.zip");
  });

  it("treats an empty-string zipPath as 'no replacement' (matches how the form serializes null)", () => {
    const result = parseEditInput({ ...validEditBody, zipPath: "" }, "seller1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.zipPath).toBeUndefined();
  });

  it("rejects a name under 3 characters", () => {
    const result = parseEditInput({ ...validEditBody, name: "ab" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "nameTooShort" });
  });

  it("rejects a description under 10 characters", () => {
    const result = parseEditInput({ ...validEditBody, description: "too short" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "descriptionTooShort" });
  });

  it("rejects a negative price", () => {
    const result = parseEditInput({ ...validEditBody, price: "-5" }, "seller1");
    expect(result).toEqual({ ok: false, status: 400, error: "priceInvalid" });
  });

  it("rejects a zip path outside the seller's namespace", () => {
    const result = parseEditInput({ ...validEditBody, zipPath: "someone-else/widget.zip" }, "seller1");
    expect(result).toEqual({ ok: false, status: 403, error: "uploadPathMismatch" });
  });

  it("accepts a comma as decimal separator", () => {
    const result = parseEditInput({ ...validEditBody, price: "12,50" }, "seller1");
    expect(result.ok && result.data.priceCents).toBe(1250);
  });
});

function fakeUploadUrlDb(opts: { result?: { data: { token: string } | null; error: { message: string } | null } }) {
  return {
    storage: {
      from: () => ({
        createSignedUploadUrl: async () => opts.result ?? { data: { token: "signed-token" }, error: null },
      }),
    },
  } as unknown as CreateUploadUrlStorage;
}

describe("createUploadUrl", () => {
  it("mints a path namespaced under the seller and returns the signed token", async () => {
    const db = fakeUploadUrlDb({});
    const result = await createUploadUrl(db, "component-zips", "seller1");

    expect(result.ok).toBe(true);
    expect(result.ok && result.path.startsWith("seller1/")).toBe(true);
    expect(result.ok && result.path.endsWith(".zip")).toBe(true);
    expect(result.ok && result.token).toBe("signed-token");
  });

  it("500s when Supabase fails to mint the URL", async () => {
    const db = fakeUploadUrlDb({ result: { data: null, error: { message: "storage down" } } });
    const result = await createUploadUrl(db, "component-zips", "seller1");

    expect(result).toEqual({ ok: false, status: 500, error: "uploadStartFailed" });
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
  } as unknown as VerifyUploadedZipStorage & { _remove: typeof remove };
}

describe("verifyUploadedZip", () => {
  it("rejects when the uploaded object can't be found", async () => {
    const db = fakeStorageDb({ listed: [] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: false, status: 400, error: "uploadNotFound" });
  });

  it("accepts a file within the size limit", async () => {
    const db = fakeStorageDb({ listed: [{ name: "widget.zip", metadata: { size: 1024 } }] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: true, sizeBytes: 1024 });
  });

  it("rejects and cleans up a file over the size limit", async () => {
    const db = fakeStorageDb({ listed: [{ name: "widget.zip", metadata: { size: 20 * 1024 * 1024 } }] });
    const result = await verifyUploadedZip(db, "bucket", "seller1/widget.zip");
    expect(result).toEqual({ ok: false, status: 413, error: "zipTooLarge" });
    expect(db._remove).toHaveBeenCalledWith(["seller1/widget.zip"]);
  });
});

function fakePublishDb(opts: {
  insertComponent?: { data: { id: string } | null; error: { message: string } | null };
  upsertTags?: { data: { id: string; name: string }[] | null; error: { message: string } | null };
  insertTagLinks?: { error: { message: string } | null };
  onInsertComponent?: (row: unknown) => void;
}) {
  return {
    from: (table: string) => {
      if (table === "components") {
        return {
          insert: (row: unknown) => (opts.onInsertComponent?.(row), {
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
  } as unknown as PublishComponentDb;
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

  it("saves the component priced in EUR", async () => {
    let inserted: unknown;
    const db = fakePublishDb({ onInsertComponent: (row) => (inserted = row) });
    await publishComponent(db, publishArgs);
    expect(inserted).toMatchObject({ price_cents: 500, currency: "eur" });
  });

  it("fails when the component insert fails", async () => {
    const db = fakePublishDb({ insertComponent: { data: null, error: { message: "constraint" } } });
    const result = await publishComponent(db, publishArgs);
    expect(result).toEqual({ ok: false, status: 500, error: "publishFailed" });
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
      error: "publishedTagsFailed",
    });
  });

  it("reports a visible failure when saving tags fails", async () => {
    const db = fakePublishDb({ upsertTags: { data: null, error: { message: "db down" } } });
    const result = await publishComponent(db, publishArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "publishedTagsFailed",
    });
  });
});

type FakeUpdateOpts = {
  existing?: { id: string; seller_id: string; zip_path: string | null } | null;
  updateError?: { message: string } | null;
  unlinkError?: { message: string } | null;
  upsertTags?: { data: { id: string; name: string }[] | null; error: { message: string } | null };
  insertLinks?: { error: { message: string } | null };
};

function fakeUpdateDb(opts: FakeUpdateOpts): UpdateComponentDb & {
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
    expect(result).toEqual({ ok: false, status: 404, error: "notFound" });
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
      error: "notOwner",
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
    expect(result).toEqual({ ok: false, status: 500, error: "saveFailed" });
  });

  it("reports a visible partial failure when clearing old tags fails", async () => {
    const db = fakeUpdateDb({ unlinkError: { message: "fk violation" } });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "updatedTagsFailed",
    });
  });

  it("reports a visible partial failure when linking new tags fails", async () => {
    const db = fakeUpdateDb({ insertLinks: { error: { message: "fk violation" } } });
    const result = await updateComponent(db, editArgs);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "updatedTagsFailed",
    });
  });
});

describe("isOwnedBySeller", () => {
  it("is true when the component's seller_id matches", () => {
    expect(isOwnedBySeller({ seller_id: "seller1" }, "seller1")).toBe(true);
  });

  it("is false when the component's seller_id belongs to someone else", () => {
    expect(isOwnedBySeller({ seller_id: "someone-else" }, "seller1")).toBe(false);
  });
});
