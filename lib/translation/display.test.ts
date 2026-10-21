import { describe, it, expect } from "vitest";
import {
  loadTranslationRows,
  shownTexts,
  localizeSummaries,
  shownText,
  type DisplayRow,
  type DisplayDb,
} from "@/lib/translation/display";
import { sourceHash, type ComponentSource } from "@/lib/translation/plan";
import type { ComponentSummary } from "@/types/database";

const source: ComponentSource = { source_language: "en", description: "A tool for agents.", readme: "# Agent tool" };

// Made from the current Source text of its field unless overridden.
function row(overrides: Partial<DisplayRow> = {}): DisplayRow {
  const field = (overrides.field ?? "description") as "description" | "readme";
  return {
    locale: "de",
    field,
    kind: "machine",
    status: "ready",
    source_hash: sourceHash(source[field] ?? ""),
    failure_reason: null,
    text: "Ein Werkzeug.",
    ...overrides,
  };
}

describe("shownText", () => {
  it("shows the Source text instead of a machine Translation of an older Source text", () => {
    expect(shownText(source, [row({ source_hash: sourceHash("old text") })], "de", "description")).toEqual({
      text: "A tool for agents.",
      machineTranslatedFrom: null,
    });
  });

  it("still shows a stale hand-edited Translation: it is the Seller's own words", () => {
    expect(
      shownText(source, [row({ kind: "hand", source_hash: sourceHash("old text"), text: "Von Hand." })], "de", "description")
    ).toEqual({ text: "Von Hand.", machineTranslatedFrom: null });
  });

  it("shows a ready machine Translation, labelled with the source language", () => {
    expect(shownText(source, [row()], "de", "description")).toEqual({
      text: "Ein Werkzeug.",
      machineTranslatedFrom: "en",
    });
  });

  it("shows a hand-edited Translation unlabelled, stale or not", () => {
    expect(shownText(source, [row({ kind: "hand", text: "Von Hand." })], "de", "description")).toEqual({
      text: "Von Hand.",
      machineTranslatedFrom: null,
    });
  });

  it("shows the Source text while the Translation is pending or failed", () => {
    for (const status of ["pending", "failed"]) {
      expect(shownText(source, [row({ status, text: null })], "de", "description")).toEqual({
        text: source.description,
        machineTranslatedFrom: null,
      });
    }
  });

  it("shows the Source text for a readme too long to translate", () => {
    const long = { ...source, readme: "x".repeat(50_001) };
    const failed = row({ field: "readme", status: "failed", text: null });
    expect(shownText(long, [failed], "de", "readme")).toEqual({ text: long.readme, machineTranslatedFrom: null });
  });

  it("shows the Source text when no Translation exists for the Locale", () => {
    expect(shownText(source, [row({ locale: "zh-CN" })], "de", "description").text).toBe(source.description);
    expect(shownText(source, [row()], "de", "readme").text).toBe(source.readme);
  });

  it("shows the Source text in the Locale it is written in, even if a row is left over", () => {
    expect(shownText(source, [row({ locale: "en", kind: "hand" })], "en", "description").text).toBe(source.description);
  });

  it("labels a Translation of a source in another language as such", () => {
    const other = { ...source, source_language: "other" };
    expect(shownText(other, [row()], "de", "description").machineTranslatedFrom).toBe("other");
  });

  it("shows an empty readme as empty", () => {
    expect(shownText({ ...source, readme: null }, [], "de", "readme").text).toBe("");
  });
});

function summary(overrides: Partial<ComponentSummary> = {}): ComponentSummary {
  return {
    id: "c1",
    name: "Widget",
    description: "A widget.",
    source_language: "en",
    ecosystems: [],
    price_cents: 0,
    currency: "eur",
    star_count: 0,
    download_count: 0,
    ...overrides,
  };
}

function fakeDb(rows: (DisplayRow & { component_id: string })[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const query: Record<string, unknown> = {};
  const record = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
    return query;
  };
  query.in = (...args: unknown[]) => record("in", ...args);
  query.eq = (...args: unknown[]) => record("eq", ...args);
  query.then = (resolve: (value: { data: typeof rows }) => void) => Promise.resolve(resolve({ data: rows }));
  const db = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return { select: (...args: unknown[]) => record("select", ...args) };
    },
  } as unknown as DisplayDb;
  return { db, calls };
}

describe("localizeSummaries", () => {
  it("swaps in each card's ready description Translation for the Locale", async () => {
    const { db, calls } = fakeDb([{ component_id: "c2", ...row({ kind: "hand", text: "Zwei." }) }]);
    const result = await localizeSummaries(db, [summary(), summary({ id: "c2", description: "Two." })], "de");

    expect(result.map((c) => [c.description, c.machineTranslatedFrom])).toEqual([
      ["A widget.", null],
      ["Zwei.", null],
    ]);
    expect(calls).toContainEqual({ method: "in", args: ["component_id", ["c1", "c2"]] });
    expect(calls).toContainEqual({ method: "eq", args: ["locale", "de"] });
    expect(calls).toContainEqual({ method: "eq", args: ["field", "description"] });
  });

  it("labels a machine Translation on a card", async () => {
    const { db } = fakeDb([{ component_id: "c1", ...row({ source_hash: sourceHash("A widget.") }) }]);
    const [card] = await localizeSummaries(db, [summary()], "de");
    expect(card).toMatchObject({ description: "Ein Werkzeug.", machineTranslatedFrom: "en" });
  });

  it("skips the query when there are no cards", async () => {
    const { db, calls } = fakeDb([]);
    expect(await localizeSummaries(db, [], "de")).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe("loadTranslationRows", () => {
  it("loads the Component's rows for the Locale", async () => {
    const rows = [{ component_id: "c1", ...row() }];
    const { db, calls } = fakeDb(rows);
    expect(await loadTranslationRows(db, "c1", "de")).toEqual(rows);
    expect(calls).toContainEqual({ method: "in", args: ["component_id", ["c1"]] });
    expect(calls).toContainEqual({ method: "eq", args: ["locale", "de"] });
  });
});

describe("shownTexts", () => {
  it("resolves description and readme from the Component's rows for the Locale", () => {
    const shown = shownTexts(source, [row(), row({ field: "readme", kind: "hand", text: "# Werkzeug" })], "de");
    expect(shown).toEqual({
      description: { text: "Ein Werkzeug.", machineTranslatedFrom: "en" },
      readme: { text: "# Werkzeug", machineTranslatedFrom: null },
    });
  });

  it("shows the Source text in the Locale the source is written in", () => {
    const shown = shownTexts(source, [row({ locale: "en" })], "en");
    expect(shown.description).toEqual({ text: source.description, machineTranslatedFrom: null });
  });
});
