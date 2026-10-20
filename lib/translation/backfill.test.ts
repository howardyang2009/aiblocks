import { describe, it, expect, vi } from "vitest";
import { backfillTranslations, guessSourceLanguage, type BackfillDb } from "@/lib/translation/backfill";
import type { TranslationClient } from "@/lib/translation/claude";

type Row = { id: string; status: string; source_language: string | null; description: string };

function fakeDb(rows: Row[]) {
  const updates: { id: string; source_language: string }[] = [];
  const pages: [number, number][] = [];
  const db = {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            pages.push([from, to]);
            return { data: rows.slice(from, to + 1), error: null };
          },
        }),
      }),
      update: (patch: { source_language: string }) => ({
        eq: async (_: string, id: string) => {
          updates.push({ id, ...patch });
          return { error: null };
        },
      }),
    }),
  } as unknown as BackfillDb;
  return { db, updates, pages };
}

// Answers every call with `answer`, or throws it.
function fakeClient(answer: string | Error = "de") {
  return {
    messages: {
      stream: vi.fn(() => ({
        finalMessage: async () => {
          if (answer instanceof Error) throw answer;
          return { stop_reason: "end_turn", content: [{ type: "text", text: answer }] };
        },
      })),
    },
  } as unknown as TranslationClient;
}

describe("guessSourceLanguage", () => {
  it("returns the Locale Claude names, or other", async () => {
    expect(await guessSourceLanguage(fakeClient("zh-CN"), "一个代理工具")).toBe("zh-CN");
    expect(await guessSourceLanguage(fakeClient("other"), "Un outil pour agents")).toBe("other");
  });

  it("falls back to en when the answer is unclear or the call fails", async () => {
    expect(await guessSourceLanguage(fakeClient("maybe German?"), "Hallo")).toBe("en");
    expect(await guessSourceLanguage(fakeClient(new Error("boom")), "Hallo")).toBe("en");
  });
});

describe("backfillTranslations", () => {
  const rows: Row[] = [
    { id: "c1", status: "published", source_language: null, description: "Ein Werkzeug" },
    { id: "c2", status: "published", source_language: "en", description: "A tool" },
    { id: "c3", status: "draft", source_language: null, description: "Entwurf" },
  ];

  it("guesses a source language only where none is set yet, published or not", async () => {
    const { db, updates } = fakeDb(rows);
    await backfillTranslations(db, fakeClient(), { translate: vi.fn() });
    expect(updates).toEqual([
      { id: "c1", source_language: "de" },
      { id: "c3", source_language: "de" },
    ]);
  });

  it("queues Translations for every published Component", async () => {
    const translate = vi.fn();
    const { db } = fakeDb(rows);
    const summary = await backfillTranslations(db, fakeClient(), { translate });
    expect(translate.mock.calls.map(([id]) => id)).toEqual(["c1", "c2"]);
    expect(summary).toEqual({ guessed: 2, translated: 2 });
  });

  it("reads past Supabase's 1,000-row page limit", async () => {
    const many = Array.from({ length: 1500 }, (_, i) => ({ id: `c${i}`, status: "draft", source_language: "en", description: "x" }));
    const { db, pages } = fakeDb(many);
    await backfillTranslations(db, fakeClient(), { translate: vi.fn() });
    expect(pages).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("writes and translates nothing on a dry run", async () => {
    const translate = vi.fn();
    const { db, updates } = fakeDb(rows);
    const summary = await backfillTranslations(db, fakeClient(), { translate, dryRun: true });
    expect(updates).toEqual([]);
    expect(translate).not.toHaveBeenCalled();
    expect(summary).toEqual({ guessed: 2, translated: 2 });
  });
});
