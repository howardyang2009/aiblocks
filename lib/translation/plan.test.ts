import { describe, it, expect } from "vitest";
import {
  isStale,
  planTranslations,
  sourceHash,
  targetLocales,
  type ComponentSource,
  type TranslationRow,
} from "@/lib/translation/plan";
import { parseSourceLanguage } from "@/lib/translation/source-language";

const source: ComponentSource = { source_language: "en", description: "A tool for agents.", readme: "# Agent tool" };

function row(overrides: Partial<TranslationRow> = {}): TranslationRow {
  return {
    locale: "de",
    field: "description",
    kind: "machine",
    source_hash: sourceHash(source.description),
    status: "ready",
    failure_reason: null,
    ...overrides,
  };
}

describe("sourceHash", () => {
  it("is stable for the same text and differs when the text changes", () => {
    expect(sourceHash("abc")).toBe(sourceHash("abc"));
    expect(sourceHash("abc")).not.toBe(sourceHash("abd"));
    expect(sourceHash("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("targetLocales", () => {
  it("targets the other two Locales for a Locale-language source", () => {
    expect(targetLocales("en")).toEqual(["de", "zh-CN"]);
    expect(targetLocales("zh-CN")).toEqual(["de", "en"]);
  });

  it("targets all three Locales when the source is in another language", () => {
    expect(targetLocales("other")).toEqual(["de", "en", "zh-CN"]);
  });
});

describe("parseSourceLanguage", () => {
  it("accepts the three Locales and other, and nothing else", () => {
    expect(parseSourceLanguage("zh-CN")).toBe("zh-CN");
    expect(parseSourceLanguage("other")).toBe("other");
    expect(parseSourceLanguage("fr")).toBeNull();
    expect(parseSourceLanguage(undefined)).toBeNull();
  });
});

describe("planTranslations", () => {
  const tasks = (rows: TranslationRow[], src = source, opts = {}) =>
    planTranslations(src, rows, opts).tasks.map((t) => `${t.locale}:${t.field}`).sort();

  it("queues every field for every target Locale when nothing is translated yet", () => {
    expect(tasks([])).toEqual(["de:description", "de:readme", "zh-CN:description", "zh-CN:readme"]);
  });

  it("carries the Source text and its hash on each task", () => {
    const [task] = planTranslations(source, []).tasks.filter((t) => t.locale === "de" && t.field === "readme");
    expect(task).toEqual({ locale: "de", field: "readme", text: "# Agent tool", sourceHash: sourceHash("# Agent tool") });
  });

  it("skips a field whose Translation was made from the current Source text", () => {
    expect(tasks([row()])).not.toContain("de:description");
  });

  it("re-queues a machine Translation once its Source text changed", () => {
    expect(tasks([row({ source_hash: sourceHash("old text") })])).toContain("de:description");
  });

  it("never queues over a hand-edited Translation, even a stale one", () => {
    expect(tasks([row({ kind: "hand", source_hash: sourceHash("old text") })])).not.toContain("de:description");
  });

  it("does not translate an empty readme", () => {
    expect(tasks([], { ...source, readme: "  " })).toEqual(["de:description", "zh-CN:description"]);
    expect(tasks([], { ...source, readme: null })).toEqual(["de:description", "zh-CN:description"]);
  });
});

describe("planTranslations retry", () => {
  const tasks = (rows: TranslationRow[]) =>
    planTranslations(source, rows, { retry: true }).tasks.map((t) => `${t.locale}:${t.field}`);

  it("re-queues a failed or stuck pending machine Translation of the current text", () => {
    expect(tasks([row({ status: "failed", failure_reason: "api_error" })])).toContain("de:description");
    expect(tasks([row({ status: "pending" })])).toContain("de:description");
  });

  it("keeps ready, hand-edited and too-long rows as they are", () => {
    expect(tasks([row()])).not.toContain("de:description");
    expect(tasks([row({ kind: "hand", status: "pending" })])).not.toContain("de:description");
    expect(tasks([row({ field: "readme", source_hash: sourceHash("# Agent tool"), status: "failed", failure_reason: "too_long" })])).not.toContain(
      "de:readme"
    );
  });

  it("leaves failed rows alone without retry, until the Source text changes", () => {
    expect(planTranslations(source, [row({ status: "failed", failure_reason: "api_error" })]).tasks.map((t) => t.locale + t.field)).not.toContain(
      "dedescription"
    );
  });
});

describe("planTranslations obsolete", () => {
  const obsolete = (rows: TranslationRow[], src = source) =>
    planTranslations(src, rows).obsolete.map((o) => `${o.locale}:${o.field}`);

  it("drops machine Translations of a field that is now empty", () => {
    const readmeRow = row({ field: "readme", source_hash: sourceHash("# Agent tool") });
    expect(obsolete([readmeRow], { ...source, readme: "" })).toEqual(["de:readme"]);
  });

  it("drops the machine Translation into the Locale the source is now written in", () => {
    expect(obsolete([row({ locale: "en" })])).toEqual(["en:description"]);
  });

  it("never drops a hand-edited Translation", () => {
    expect(obsolete([row({ locale: "en", kind: "hand" })])).toEqual([]);
  });
});

describe("isStale", () => {
  it("flags a hand Translation made from older Source text", () => {
    expect(isStale(row({ kind: "hand", source_hash: sourceHash("old") }), "A tool for agents.")).toBe(true);
    expect(isStale(row({ kind: "hand" }), "A tool for agents.")).toBe(false);
  });

  it("never flags a machine Translation, which is redone instead", () => {
    expect(isStale(row({ source_hash: sourceHash("old") }), "A tool for agents.")).toBe(false);
  });
});
