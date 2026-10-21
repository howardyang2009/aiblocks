import { createHash } from "node:crypto";
import { routing, type Locale } from "@/i18n/routing";
import { parseSourceLanguage, type SourceLanguage } from "./source-language";

// Which Translations a Component needs (ADR 0006, #69). Pure: no I/O, so the
// queue, hash and stale rules are testable with plain objects.

/** The Source text fields that get a Translation. `name` is never translated. */
export const TRANSLATED_FIELDS = ["description", "readme"] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

/** The Source text a Translation is made from, as stored on `components`. */
export type ComponentSource = { source_language: string; description: string; readme: string | null };

/** Why a machine Translation failed; mirrors the 0008 CHECK constraint. */
export type FailureReason = "too_long" | "implausible" | "api_error";

/** The parts of a `component_translations` row the planner reads. */
export type TranslationRow = {
  locale: string;
  field: string;
  kind: string;
  source_hash: string;
  status: string;
  failure_reason: string | null;
};

/** One field to machine-translate into one Locale. */
export type TranslationTask = { locale: Locale; field: TranslatedField; text: string; sourceHash: string };

/** A machine Translation that no longer has anything to translate. */
export type ObsoleteTranslation = { locale: string; field: string };

export type TranslationPlan = { tasks: TranslationTask[]; obsolete: ObsoleteTranslation[] };

/** The declared source language; an unknown or missing one counts as `other`. */
export function sourceLanguageOf(source: ComponentSource): SourceLanguage {
  return parseSourceLanguage(source.source_language) ?? "other";
}

/** SHA-256 of a Source text: which text a Translation was made from. */
export function sourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Every Locale except the one the Source text is written in. */
export function targetLocales(language: SourceLanguage): Locale[] {
  return routing.locales.filter((locale) => locale !== language);
}

// A machine row of the current Source text that never became ready: the job
// failed, or was cut off while pending. Retried on request only (backfill,
// #71's Retry); a readme that is too long stays failed.
function needsRetry(row: TranslationRow): boolean {
  return row.kind === "machine" && row.status !== "ready" && row.failure_reason !== "too_long";
}

/**
 * The Translations to (re)make: every target Locale x field whose Source text
 * changed since its Translation was made (with `retry`, also unfinished ones).
 * Hand-edited rows are never queued; they go stale instead (see isStale).
 * Machine rows for an emptied field, or for the Locale the source is now
 * written in, are obsolete.
 */
export function planTranslations(
  source: ComponentSource,
  rows: TranslationRow[],
  opts: { retry?: boolean } = {}
): TranslationPlan {
  const targets = targetLocales(sourceLanguageOf(source));
  const tasks = targets.flatMap((locale) =>
    TRANSLATED_FIELDS.flatMap((field) => {
      const text = source[field] ?? "";
      if (!text.trim()) return [];
      const hash = sourceHash(text);
      const existing = rows.find((r) => r.locale === locale && r.field === field);
      if (existing?.kind === "hand") return [];
      if (existing && existing.source_hash === hash && !(opts.retry && needsRetry(existing))) return [];
      return [{ locale, field, text, sourceHash: hash }];
    })
  );
  const obsolete = rows
    .filter((r) => r.kind === "machine")
    .filter((r) => !targets.some((l) => l === r.locale) || !(source[r.field as TranslatedField] ?? "").trim())
    .map(({ locale, field }) => ({ locale, field }));
  return { tasks, obsolete };
}

/** A hand-edited Translation whose Source text changed after the edit. */
export function isStale(row: TranslationRow, currentSourceText: string): boolean {
  return row.kind === "hand" && row.source_hash !== sourceHash(currentSourceText);
}

/**
 * The one answer to "what state is this Translation in, given the current
 * Source text": the planner, the Seller's edit page and readers all agree
 * through it. A machine row made from an older Source text is pending
 * (about to be redone), never current.
 */
export type FieldState = "empty" | "pending" | "failed" | "tooLong" | "machine" | "hand" | "stale";

export function fieldState(row: TranslationRow | undefined, sourceText: string): FieldState {
  if (!sourceText.trim()) return "empty";
  if (!row) return "pending";
  if (row.kind === "hand") return isStale(row, sourceText) ? "stale" : "hand";
  if (row.status === "pending" || row.source_hash !== sourceHash(sourceText)) return "pending";
  if (row.status === "failed") return row.failure_reason === "too_long" ? "tooLong" : "failed";
  return "machine";
}
