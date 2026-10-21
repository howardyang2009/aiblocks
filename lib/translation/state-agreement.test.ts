import { describe, it, expect } from "vitest";
import { fieldState, planTranslations, sourceHash, type ComponentSource, type TranslationRow } from "@/lib/translation/plan";
import { shownText } from "@/lib/translation/display";

// The planner, the Seller's edit page and readers must agree about one
// Translation. Each case runs one row through all three.

const source: ComponentSource = { source_language: "en", description: "New text.", readme: null };

function row(overrides: Partial<TranslationRow & { text: string }>): TranslationRow & { text: string } {
  return {
    locale: "de",
    field: "description",
    kind: "machine",
    source_hash: sourceHash(source.description),
    status: "ready",
    failure_reason: null,
    text: "Neuer Text.",
    ...overrides,
  };
}

function views(r: TranslationRow & { text: string }) {
  return {
    queued: planTranslations(source, [r]).tasks.some((t) => t.locale === "de" && t.field === "description"),
    sellerSees: fieldState(r, source.description),
    readerSees: shownText(source, [r], "de", "description").text,
  };
}

describe("Translation state agreement", () => {
  it("current machine Translation: not queued, shown to readers", () => {
    expect(views(row({}))).toEqual({ queued: false, sellerSees: "machine", readerSees: "Neuer Text." });
  });

  it("machine Translation of an older Source text: queued, pending to the Seller, Source text to readers", () => {
    expect(views(row({ source_hash: sourceHash("Old text."), text: "Alter Text." }))).toEqual({
      queued: true,
      sellerSees: "pending",
      readerSees: "New text.",
    });
  });

  it("stale hand-edited Translation: never queued, flagged to the Seller, still shown to readers", () => {
    expect(views(row({ kind: "hand", source_hash: sourceHash("Old text."), text: "Von Hand." }))).toEqual({
      queued: false,
      sellerSees: "stale",
      readerSees: "Von Hand.",
    });
  });
});
