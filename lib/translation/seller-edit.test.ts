import { describe, it, expect } from "vitest";
import {
  editView,
  parseHandTranslationInput,
  parseResetInput,
  saveHandTranslations,
  resetToMachine,
  markSourceLanguageChanged,
  type EditableRow,
  type SellerTranslationsDb,
} from "@/lib/translation/seller-edit";
import { fieldState, sourceHash } from "@/lib/translation/plan";

describe("editView", () => {
  it("edits the Source text in the Locale it is written in", () => {
    expect(editView("de", "de", false)).toBe("source");
  });

  it("edits that Locale's Translation in every other Locale", () => {
    expect(editView("de", "en", false)).toBe("translation");
    expect(editView("other", "zh-CN", false)).toBe("translation");
  });

  it("edits a Source text in another language only in the separate Source text view", () => {
    expect(editView("other", "de", true)).toBe("source");
  });

  it("offers the separate Source text view only for a Source text in another language", () => {
    expect(editView("en", "de", true)).toBe("translation");
  });
});

const SOURCE = "A tool for agents.";

function row(overrides: Partial<EditableRow> = {}): EditableRow {
  return {
    locale: "de",
    field: "description",
    kind: "machine",
    source_hash: sourceHash(SOURCE),
    status: "ready",
    failure_reason: null,
    text: "Ein Werkzeug.",
    ...overrides,
  };
}

describe("fieldState", () => {
  it("has nothing to translate when the Source text is empty", () => {
    expect(fieldState(undefined, "  ")).toBe("empty");
  });

  it("is translating while no row exists yet or the row is pending", () => {
    expect(fieldState(undefined, SOURCE)).toBe("pending");
    expect(fieldState(row({ status: "pending", text: null }), SOURCE)).toBe("pending");
  });

  it("is translating while a ready machine row waits for its re-translation", () => {
    expect(fieldState(row({ source_hash: sourceHash("old text") }), SOURCE)).toBe("pending");
  });

  it("is a ready machine Translation", () => {
    expect(fieldState(row(), SOURCE)).toBe("machine");
  });

  it("is translating while a failed machine row waits for its re-translation", () => {
    const old = { source_hash: sourceHash("old text"), status: "failed", text: null };
    expect(fieldState(row({ ...old, failure_reason: "too_long" }), SOURCE)).toBe("pending");
    expect(fieldState(row({ ...old, failure_reason: "api_error" }), SOURCE)).toBe("pending");
  });

  it("separates a readme too long to translate from other failures", () => {
    expect(fieldState(row({ status: "failed", failure_reason: "too_long", text: null }), SOURCE)).toBe("tooLong");
    expect(fieldState(row({ status: "failed", failure_reason: "api_error", text: null }), SOURCE)).toBe("failed");
    expect(fieldState(row({ status: "failed", failure_reason: "implausible", text: null }), SOURCE)).toBe("failed");
  });

  it("is a hand edit, stale once the Source text changed after it", () => {
    expect(fieldState(row({ kind: "hand" }), SOURCE)).toBe("hand");
    expect(fieldState(row({ kind: "hand", source_hash: sourceHash("old text") }), SOURCE)).toBe("stale");
  });
});

describe("parseHandTranslationInput", () => {
  it("takes the Locale and the changed fields", () => {
    expect(parseHandTranslationInput({ locale: "de", description: " Ein Werkzeug für Agenten. ", readme: "# Hallo" })).toEqual({
      ok: true,
      data: { locale: "de", texts: { description: "Ein Werkzeug für Agenten.", readme: "# Hallo" } },
    });
    expect(parseHandTranslationInput({ locale: "zh-CN", readme: "# 你好" })).toEqual({
      ok: true,
      data: { locale: "zh-CN", texts: { readme: "# 你好" } },
    });
  });

  it("rejects an unknown Locale", () => {
    expect(parseHandTranslationInput({ locale: "fr", readme: "x" })).toMatchObject({ ok: false, status: 400, error: "translationLocaleInvalid" });
  });

  it("holds a translated description to the same rule as the Source text", () => {
    expect(parseHandTranslationInput({ locale: "de", description: "kurz" })).toMatchObject({ ok: false, status: 400, error: "descriptionTooShort" });
  });

  it("rejects a request with no field to save", () => {
    expect(parseHandTranslationInput({ locale: "de" })).toMatchObject({ ok: false, status: 400, error: "translationEmpty" });
    expect(parseHandTranslationInput({ locale: "de", readme: "   " })).toMatchObject({ ok: false, status: 400, error: "translationEmpty" });
  });
});

describe("parseResetInput", () => {
  it("takes a Locale and a translated field", () => {
    expect(parseResetInput({ locale: "en", field: "readme" })).toEqual({ ok: true, data: { locale: "en", field: "readme" } });
  });

  it("rejects anything else", () => {
    expect(parseResetInput({ locale: "en", field: "name" })).toMatchObject({ ok: false, status: 400 });
    expect(parseResetInput({ locale: "xx", field: "readme" })).toMatchObject({ ok: false, status: 400 });
  });
});

type Call = { table: string; method: string; args: unknown[] };

function fakeDb(component: { seller_id: string; source_language: string; description: string; readme: string | null } | null, writeError: string | null = null) {
  const calls: Call[] = [];
  const chain = (table: string) => {
    const scoped: Record<string, unknown> = {};
    scoped.eq = (...args: unknown[]) => {
      calls.push({ table, method: "eq", args });
      return scoped;
    };
    scoped.then = (resolve: (v: { error: { message: string } | null }) => void) =>
      Promise.resolve(resolve({ error: writeError ? { message: writeError } : null }));
    return scoped;
  };
  const db = {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: component }) }) }),
      upsert: (...args: unknown[]) => {
        calls.push({ table, method: "upsert", args });
        return chain(table);
      },
      update: (...args: unknown[]) => {
        calls.push({ table, method: "update", args });
        return chain(table);
      },
      delete: () => {
        calls.push({ table, method: "delete", args: [] });
        return chain(table);
      },
    }),
  } as unknown as SellerTranslationsDb;
  return { db, calls };
}

const owned = { seller_id: "s1", source_language: "en", description: SOURCE, readme: "# Tool" };

describe("saveHandTranslations", () => {
  it("stores each changed field as a ready hand row made from the current Source text", async () => {
    const { db, calls } = fakeDb(owned);
    const result = await saveHandTranslations(db, {
      componentId: "c1",
      sellerId: "s1",
      input: { locale: "de", texts: { description: "Ein Werkzeug für Agenten.", readme: "# Werkzeug" } },
    });

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        table: "component_translations",
        method: "upsert",
        args: [
          [
            { component_id: "c1", locale: "de", field: "description", text: "Ein Werkzeug für Agenten.", kind: "hand", status: "ready", failure_reason: null, source_hash: sourceHash(SOURCE) },
            { component_id: "c1", locale: "de", field: "readme", text: "# Werkzeug", kind: "hand", status: "ready", failure_reason: null, source_hash: sourceHash("# Tool") },
          ],
          { onConflict: "component_id,locale,field" },
        ],
      },
    ]);
  });

  it("refuses a Component that is missing or someone else's", async () => {
    const input = { locale: "de" as const, texts: { readme: "x" } };
    expect(await saveHandTranslations(fakeDb(null).db, { componentId: "c1", sellerId: "s1", input })).toMatchObject({ status: 404 });
    expect(await saveHandTranslations(fakeDb(owned).db, { componentId: "c1", sellerId: "s2", input })).toMatchObject({ status: 403 });
  });

  it("skips a field whose Source text is empty, and refuses when nothing is left", async () => {
    const noReadme = { ...owned, readme: null };
    const { db, calls } = fakeDb(noReadme);
    const input = { locale: "de" as const, texts: { description: "Ein Werkzeug für Agenten.", readme: "# Werkzeug" } };
    expect(await saveHandTranslations(db, { componentId: "c1", sellerId: "s1", input })).toEqual({ ok: true });
    expect((calls[0].args[0] as { field: string }[]).map((r) => r.field)).toEqual(["description"]);

    const onlyReadme = { locale: "de" as const, texts: { readme: "# Werkzeug" } };
    expect(await saveHandTranslations(fakeDb(noReadme).db, { componentId: "c1", sellerId: "s1", input: onlyReadme })).toMatchObject({
      ok: false,
      status: 400,
      error: "translationEmpty",
    });
  });

  it("refuses a Translation into the Locale the source is written in", async () => {
    const { db, calls } = fakeDb(owned);
    const result = await saveHandTranslations(db, { componentId: "c1", sellerId: "s1", input: { locale: "en", texts: { readme: "x" } } });
    expect(result).toMatchObject({ ok: false, status: 400, error: "translationLocaleInvalid" });
    expect(calls).toEqual([]);
  });

  it("reports a failed write", async () => {
    const { db } = fakeDb(owned, "boom");
    const result = await saveHandTranslations(db, { componentId: "c1", sellerId: "s1", input: { locale: "de", texts: { readme: "x" } } });
    expect(result).toMatchObject({ ok: false, status: 500, error: "translationSaveFailed" });
  });
});

describe("resetToMachine", () => {
  it("deletes only the hand row of that Locale and field", async () => {
    const { db, calls } = fakeDb(owned);
    expect(await resetToMachine(db, { componentId: "c1", sellerId: "s1", input: { locale: "de", field: "readme" } })).toEqual({ ok: true });
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ["delete"],
      ["eq", "component_id", "c1"],
      ["eq", "locale", "de"],
      ["eq", "field", "readme"],
      ["eq", "kind", "hand"],
    ]);
  });

  it("refuses someone else's Component", async () => {
    const { db, calls } = fakeDb(owned);
    expect(await resetToMachine(db, { componentId: "c1", sellerId: "s2", input: { locale: "de", field: "readme" } })).toMatchObject({ status: 403 });
    expect(calls).toEqual([]);
  });
});

describe("markSourceLanguageChanged", () => {
  it("clears every row's source hash, so machine rows are redone and hand rows go stale", async () => {
    const { db, calls } = fakeDb(owned);
    await markSourceLanguageChanged(db, "c1");
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ["update", { source_hash: "" }],
      ["eq", "component_id", "c1"],
    ]);
    expect(fieldState(row({ kind: "hand", source_hash: "" }), SOURCE)).toBe("stale");
  });
});
