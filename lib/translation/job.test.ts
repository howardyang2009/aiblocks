import { describe, it, expect, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { runTranslationJob, type TranslationJobDb } from "@/lib/translation/job";
import { sourceHash } from "@/lib/translation/plan";
import type { TranslationClient } from "@/lib/translation/claude";

type Component = { id: string; source_language: string; description: string; readme: string | null };
type Row = {
  component_id: string;
  locale: string;
  field: string;
  kind: string;
  source_hash: string;
  status: string;
  text: string | null;
  failure_reason: string | null;
};

// An in-memory components + component_translations store behind the narrow
// query chains the job uses.
// `beforeQueue` runs between the job's read of the rows and its queue write,
// to simulate a concurrent hand edit.
function fakeDb(component: Component | null, rows: Row[] = [], opts: { beforeQueue?: (rows: Row[]) => void } = {}) {
  const state = { component, rows: rows.map((r) => ({ ...r })) };
  let queued = false;
  const beforeWrite = () => {
    if (!queued) opts.beforeQueue?.(state.rows);
    queued = true;
  };
  const matches = (row: Row, filters: [string, string][]) =>
    filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value);

  const filtered = (apply: (filters: [string, string][]) => void) => {
    const filters: [string, string][] = [];
    const chain = {
      eq(column: string, value: string) {
        filters.push([column, value]);
        return chain;
      },
      then(resolve: (value: { error: null }) => void) {
        apply(filters);
        resolve({ error: null });
      },
    };
    return chain;
  };

  const db = {
    from(table: string) {
      if (table === "components") {
        return {
          select: () => ({
            eq: (_: string, id: string) => ({
              maybeSingle: async () => ({ data: state.component && state.component.id === id ? { ...state.component } : null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async (_: string, id: string) => ({ data: state.rows.filter((r) => r.component_id === id) }),
        }),
        // ignoreDuplicates: insert only rows that do not exist yet.
        upsert: async (incoming: Row[]) => {
          beforeWrite();
          for (const next of incoming) {
            const at = state.rows.findIndex((r) => r.component_id === next.component_id && r.locale === next.locale && r.field === next.field);
            if (at === -1) state.rows.push({ ...next });
          }
          return { error: null };
        },
        update: (patch: Partial<Row>) =>
          filtered((filters) => {
            beforeWrite();
            for (const row of state.rows) if (matches(row, filters)) Object.assign(row, patch);
          }),
        delete: () =>
          filtered((filters) => {
            state.rows = state.rows.filter((row) => !matches(row, filters));
          }),
      };
    },
  } as unknown as TranslationJobDb;
  return { db, state };
}

const LOCALE_BY_NAME: Record<string, string> = { German: "de", English: "en", "Simplified Chinese": "zh-CN" };

// A Claude client that "translates" to `[locale] <source>`; `onCall` can
// change the world mid-translation.
function fakeClient(opts: { fail?: (text: string) => boolean; onCall?: () => void } = {}) {
  const calls: { to: string; text: string }[] = [];
  const client = {
    messages: {
      stream: vi.fn((params: Anthropic.MessageStreamParams) => {
        const content = String(params.messages[0].content);
        const to = LOCALE_BY_NAME[/into ([A-Za-z ]+)\./.exec(content)![1]];
        const text = /<source_text_\w+>\n([\s\S]*)\n<\/source_text_\w+>/.exec(content)![1];
        calls.push({ to, text });
        return {
          finalMessage: async () => {
            opts.onCall?.();
            if (opts.fail?.(text)) throw new Error("API down");
            return { stop_reason: "end_turn", content: [{ type: "text", text: `[${to}] ${text}` }] };
          },
        };
      }),
    },
  } as unknown as TranslationClient;
  return { client, calls };
}

const component: Component = { id: "c1", source_language: "en", description: "A tool for agents.", readme: "# Agent tool" };
const find = (rows: Row[], locale: string, field: string) => rows.find((r) => r.locale === locale && r.field === field);

describe("runTranslationJob", () => {
  it("produces ready machine Translations for the other Locales of a new Component", async () => {
    const { db, state } = fakeDb(component);
    await runTranslationJob(db, fakeClient().client, "c1");

    expect(state.rows).toHaveLength(4);
    expect(find(state.rows, "de", "description")).toMatchObject({
      kind: "machine",
      status: "ready",
      text: "[de] A tool for agents.",
      source_hash: sourceHash("A tool for agents."),
      failure_reason: null,
    });
    expect(find(state.rows, "zh-CN", "readme")).toMatchObject({ status: "ready", text: "[zh-CN] # Agent tool" });
    expect(find(state.rows, "en", "description")).toBeUndefined();
  });

  it("does not re-translate a field whose Source text did not change", async () => {
    const { db } = fakeDb(component);
    await runTranslationJob(db, fakeClient().client, "c1");

    const { client, calls } = fakeClient();
    await runTranslationJob(db, client, "c1");
    expect(calls).toEqual([]);
  });

  it("replaces a machine Translation and keeps a hand-edited one when the Source text changes", async () => {
    const oldHash = sourceHash("Old description.");
    const { db, state } = fakeDb({ ...component, description: "New description." }, [
      { component_id: "c1", locale: "de", field: "description", kind: "hand", source_hash: oldHash, status: "ready", text: "Von Hand.", failure_reason: null },
      { component_id: "c1", locale: "zh-CN", field: "description", kind: "machine", source_hash: oldHash, status: "ready", text: "[zh-CN] Old description.", failure_reason: null },
    ]);
    const { client, calls } = fakeClient();
    await runTranslationJob(db, client, "c1");

    expect(find(state.rows, "de", "description")).toMatchObject({ kind: "hand", text: "Von Hand.", source_hash: oldHash });
    expect(find(state.rows, "zh-CN", "description")).toMatchObject({ kind: "machine", status: "ready", text: "[zh-CN] New description." });
    expect(calls.filter((c) => c.text === "New description.").map((c) => c.to)).toEqual(["zh-CN"]);
  });

  it("translates into all three Locales when the source is in another language", async () => {
    const { db, state } = fakeDb({ ...component, source_language: "other", readme: null });
    await runTranslationJob(db, fakeClient().client, "c1");
    expect(state.rows.map((r) => r.locale).sort()).toEqual(["de", "en", "zh-CN"]);
  });

  it("exits without writing when the Source text changed while it was translating", async () => {
    const { db, state } = fakeDb(component);
    const { client } = fakeClient({
      onCall: () => {
        state.component = { ...component, description: "Edited meanwhile." };
      },
    });
    await runTranslationJob(db, client, "c1");

    // The newer edit's own job translates the description; this one drops it.
    expect(find(state.rows, "de", "description")).toMatchObject({ status: "pending", text: null });
    expect(find(state.rows, "zh-CN", "description")).toMatchObject({ status: "pending", text: null });
    // The readme did not change, so its Translations still land.
    expect(find(state.rows, "de", "readme")).toMatchObject({ status: "ready" });
  });

  it("drops every result when the declared source language changed while it was translating", async () => {
    const { db, state } = fakeDb(component);
    const { client } = fakeClient({
      onCall: () => {
        state.component = { ...component, source_language: "de" };
      },
    });
    await runTranslationJob(db, client, "c1");

    // Made from the wrong language: the job for the new language redoes them.
    expect(state.rows.filter((r) => r.status === "ready")).toEqual([]);
  });

  it("stores a failed row when Claude keeps failing", async () => {
    const { db, state } = fakeDb(component);
    await runTranslationJob(db, fakeClient({ fail: (text) => text === "# Agent tool" }).client, "c1");

    expect(find(state.rows, "de", "readme")).toMatchObject({ status: "failed", failure_reason: "api_error", text: null });
    expect(find(state.rows, "de", "description")).toMatchObject({ status: "ready" });
  });

  it("does not translate a readme over 50,000 characters and records why", async () => {
    const readme = "x".repeat(50_001);
    const { db, state } = fakeDb({ ...component, readme });
    const { client, calls } = fakeClient();
    await runTranslationJob(db, client, "c1");

    expect(calls.some((c) => c.text === readme)).toBe(false);
    expect(find(state.rows, "de", "readme")).toMatchObject({
      status: "failed",
      failure_reason: "too_long",
      source_hash: sourceHash(readme),
    });
  });

  it("keeps a hand edit that lands while the job is queueing", async () => {
    const { db, state } = fakeDb(component, [], {
      beforeQueue: (rows) =>
        rows.push({ component_id: "c1", locale: "de", field: "description", kind: "hand", source_hash: sourceHash("x"), status: "ready", text: "Von Hand.", failure_reason: null }),
    });
    await runTranslationJob(db, fakeClient().client, "c1");
    expect(find(state.rows, "de", "description")).toMatchObject({ kind: "hand", text: "Von Hand." });
    expect(find(state.rows, "zh-CN", "description")).toMatchObject({ status: "ready" });
  });

  it("lets the job for the current text write its result even after an older job re-queued the row", async () => {
    const { db, state } = fakeDb(component, [], {
      // An older job, for text that has since changed, queues its own hash.
      beforeQueue: (rows) =>
        rows.push({ component_id: "c1", locale: "de", field: "description", kind: "machine", source_hash: sourceHash("Older text."), status: "pending", text: null, failure_reason: null }),
    });
    await runTranslationJob(db, fakeClient().client, "c1");
    expect(find(state.rows, "de", "description")).toMatchObject({
      status: "ready",
      text: "[de] A tool for agents.",
      source_hash: sourceHash("A tool for agents."),
    });
  });

  it("retries a failed Translation of the current text when asked to", async () => {
    const failed = { component_id: "c1", locale: "de", field: "description", kind: "machine", source_hash: sourceHash(component.description), status: "failed", text: null, failure_reason: "api_error" };
    const { db, state } = fakeDb({ ...component, readme: null }, [failed]);

    await runTranslationJob(db, fakeClient().client, "c1");
    expect(find(state.rows, "de", "description")).toMatchObject({ status: "failed" });

    await runTranslationJob(db, fakeClient().client, "c1", { retry: true });
    expect(find(state.rows, "de", "description")).toMatchObject({ status: "ready", failure_reason: null });
  });

  it("removes machine Translations that have nothing left to translate", async () => {
    const readmeRow = { component_id: "c1", locale: "de", field: "readme", kind: "machine", source_hash: sourceHash("# Agent tool"), status: "ready", text: "[de] # Agent tool", failure_reason: null };
    const { db, state } = fakeDb({ ...component, readme: "" }, [readmeRow]);
    await runTranslationJob(db, fakeClient().client, "c1");
    expect(find(state.rows, "de", "readme")).toBeUndefined();
  });

  it("does nothing for a Component that no longer exists", async () => {
    const { db, state } = fakeDb(null);
    const { client, calls } = fakeClient();
    await runTranslationJob(db, client, "c1");
    expect(calls).toEqual([]);
    expect(state.rows).toEqual([]);
  });
});
