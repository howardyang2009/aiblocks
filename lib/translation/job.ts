import { translateText, type TranslateResult, type TranslationClient } from "./claude";
import {
  planTranslations,
  sourceHash,
  sourceLanguageOf,
  type ComponentSource,
  type FailureReason,
  type TranslationRow,
  type TranslationTask,
} from "./plan";

// The background translation job (ADR 0006, #69): runs after a Component is
// created or edited and machine-translates every field whose Source text
// changed into every target Locale.

/** A `readme` longer than this is not translated, to bound cost (ADR 0006). */
export const README_MAX_CHARS = 50_000;

type WriteResult = PromiseLike<{ error: { message: string } | null }>;
type Filtered = WriteResult & { eq(column: string, value: string): Filtered };

type MachineFields = {
  source_hash: string;
  status: "pending" | "ready" | "failed";
  text: string | null;
  failure_reason: FailureReason | null;
};

type NewRow = MachineFields & { component_id: string; locale: string; field: string; kind: "machine" };

// The narrow slice of the Supabase client the job touches. It runs with the
// service role: machine rows are not writable by Sellers (0008 RLS).
export type TranslationJobDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: ComponentSource | null }>;
      };
    };
  };
  from(table: "component_translations"): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: TranslationRow[] | null }>;
    };
    upsert(rows: NewRow[], opts: { onConflict: string; ignoreDuplicates: true }): WriteResult;
    update(patch: MachineFields): Filtered;
    delete(): Filtered;
  };
};

async function loadSource(supabase: TranslationJobDb, componentId: string) {
  const { data } = await supabase
    .from("components")
    .select("source_language, description, readme")
    .eq("id", componentId)
    .maybeSingle();
  return data;
}

// Every write to an existing row is scoped to machine rows, so a hand edit
// that lands while the job runs is never overwritten.
function machineRow(
  supabase: TranslationJobDb,
  componentId: string,
  { locale, field }: { locale: string; field: string },
  write: (table: ReturnType<TranslationJobDb["from"]>) => Filtered
): WriteResult {
  return write(supabase.from("component_translations"))
    .eq("component_id", componentId)
    .eq("locale", locale)
    .eq("field", field)
    .eq("kind", "machine");
}

function logError(step: string) {
  return ({ error }: { error: { message: string } | null }) => {
    if (error) console.error(`runTranslationJob ${step} failed:`, error.message);
  };
}

/**
 * Translates what changed and stores the results. Latest text wins: once
 * Claude answers, a task whose Source text changed again meanwhile is
 * dropped, so only the job for the current text writes a result. With
 * `retry`, failed or stuck-pending rows of the current text are redone too
 * (the backfill; #71's Retry).
 */
export async function runTranslationJob(
  supabase: TranslationJobDb,
  client: TranslationClient,
  componentId: string,
  opts: { retry?: boolean } = {}
): Promise<void> {
  const source = await loadSource(supabase, componentId);
  if (!source) return;

  const { data } = await supabase
    .from("component_translations")
    .select("locale, field, kind, source_hash, status, failure_reason")
    .eq("component_id", componentId);
  const rows = data ?? [];
  const { tasks, obsolete } = planTranslations(source, rows, opts);

  await Promise.all(
    obsolete.map((row) => Promise.resolve(machineRow(supabase, componentId, row, (t) => t.delete())).then(logError("delete")))
  );
  if (!tasks.length) return;

  const tooLong = (task: TranslationTask) => task.field === "readme" && task.text.length > README_MAX_CHARS;
  const queued = (task: TranslationTask): MachineFields =>
    tooLong(task)
      ? { source_hash: task.sourceHash, status: "failed", text: null, failure_reason: "too_long" }
      : { source_hash: task.sourceHash, status: "pending", text: null, failure_reason: null };
  const exists = (task: TranslationTask) => rows.some((r) => r.locale === task.locale && r.field === task.field);

  // New rows are inserted only if still absent (a hand row may have appeared
  // since the read); existing ones are updated through the machine scope.
  const fresh = tasks.filter((task) => !exists(task));
  await Promise.all([
    fresh.length
      ? Promise.resolve(
          supabase.from("component_translations").upsert(
            fresh.map((task) => ({ component_id: componentId, locale: task.locale, field: task.field, kind: "machine", ...queued(task) })),
            { onConflict: "component_id,locale,field", ignoreDuplicates: true }
          )
        ).then(logError("queue"))
      : undefined,
    ...tasks
      .filter(exists)
      .map((task) => Promise.resolve(machineRow(supabase, componentId, task, (t) => t.update(queued(task)))).then(logError("queue"))),
  ]);

  const from = sourceLanguageOf(source);
  const results: [TranslationTask, TranslateResult][] = await Promise.all(
    tasks
      .filter((task) => !tooLong(task))
      .map(async (task) => [task, await translateText(client, { text: task.text, from, to: task.locale })] as const)
  );

  const current = await loadSource(supabase, componentId);
  if (!current) return;

  // A result made from text or a source language that changed meanwhile is
  // dropped: the job queued by that change writes its own.
  const stillCurrent = (task: TranslationTask) =>
    sourceLanguageOf(current) === from && sourceHash(current[task.field] ?? "") === task.sourceHash;
  await Promise.all(
    results
      .filter(([task]) => stillCurrent(task))
      .map(([task, result]) =>
        Promise.resolve(
          machineRow(supabase, componentId, task, (t) =>
            t.update(
              result.ok
                ? { source_hash: task.sourceHash, status: "ready", text: result.text, failure_reason: null }
                : { source_hash: task.sourceHash, status: "failed", text: null, failure_reason: result.reason }
            )
          )
        ).then(logError("write"))
      )
  );
}
