import { routing, type Locale } from "@/i18n/routing";
import type { Result } from "@/lib/result";
import { isOwnedBySeller, validateComponentDescription } from "@/lib/commerce/components-write";
import type { ComponentWriteError } from "@/lib/commerce/component-write-errors";
import {
  TRANSLATED_FIELDS,
  isStale,
  sourceHash,
  sourceLanguageOf,
  targetLocales,
  type ComponentSource,
  type TranslatedField,
  type TranslationRow,
} from "./plan";
import type { SourceLanguage } from "./source-language";

// A Seller correcting the Translations of their own Component on its edit
// page (ADR 0006, #71). Machine rows belong to the job (job.ts); this module
// writes only hand rows, and hands a field back to the job on reset.

/** Which text the edit page edits in a Locale. */
export type EditView = "source" | "translation";

/**
 * The Locale the Source text is written in edits the Source text; every
 * other Locale edits its Translation. A Source text in another language has
 * no such Locale, so it is edited in a separate view reachable from all.
 */
export function editView(language: SourceLanguage, locale: Locale, sourceViewRequested: boolean): EditView {
  if (language === locale) return "source";
  return language === "other" && sourceViewRequested ? "source" : "translation";
}

/** A `component_translations` row as the edit page reads it. */
export type EditableRow = TranslationRow & { text: string | null };

/** What the Seller is told about one field of one Translation. */
export type FieldState = "empty" | "pending" | "failed" | "tooLong" | "machine" | "hand" | "stale";

export function fieldState(row: EditableRow | undefined, sourceText: string): FieldState {
  if (!sourceText.trim()) return "empty";
  if (!row) return "pending";
  if (row.kind === "hand") return isStale(row, sourceText) ? "stale" : "hand";
  // A machine row made from an older Source text is about to be redone.
  if (row.status === "pending" || row.source_hash !== sourceHash(sourceText)) return "pending";
  if (row.status === "failed") return row.failure_reason === "too_long" ? "tooLong" : "failed";
  return "machine";
}

type Failure = { ok: false; status: number; error: ComponentWriteError };

const parseLocale = (value: unknown): Locale | null => routing.locales.find((l) => l === value) ?? null;

export type HandTranslationInput = { locale: Locale; texts: Partial<Record<TranslatedField, string>> };

/** The Translation fields a Seller changed; an empty field is not saved. */
export function parseHandTranslationInput(body: {
  locale?: unknown;
  description?: unknown;
  readme?: unknown;
}): { ok: true; data: HandTranslationInput } | Failure {
  const locale = parseLocale(body.locale);
  if (!locale) return { ok: false, status: 400, error: "translationLocaleInvalid" };

  const texts: HandTranslationInput["texts"] = {};
  if (typeof body.description === "string" && body.description.trim()) {
    const description = body.description.trim();
    const error = validateComponentDescription(description);
    if (error) return { ok: false, status: 400, error };
    texts.description = description;
  }
  if (typeof body.readme === "string" && body.readme.trim()) texts.readme = body.readme;
  if (!Object.keys(texts).length) return { ok: false, status: 400, error: "translationEmpty" };

  return { ok: true, data: { locale, texts } };
}

export type ResetInput = { locale: Locale; field: TranslatedField };

export function parseResetInput(body: { locale?: unknown; field?: unknown }): { ok: true; data: ResetInput } | Failure {
  const locale = parseLocale(body.locale);
  const field = TRANSLATED_FIELDS.find((f) => f === body.field);
  if (!locale || !field) return { ok: false, status: 400, error: "translationFieldInvalid" };
  return { ok: true, data: { locale, field } };
}

type WriteResult = PromiseLike<{ error: { message: string } | null }>;
type Scoped = WriteResult & { eq(column: string, value: string): Scoped };

type HandRow = {
  component_id: string;
  locale: Locale;
  field: TranslatedField;
  text: string;
  kind: "hand";
  status: "ready";
  failure_reason: null;
  source_hash: string;
};

// The narrow slice of the Supabase client these writes touch. Runs with the
// service role behind an ownership check, like every other API write.
export type SellerTranslationsDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: (ComponentSource & { seller_id: string }) | null }>;
      };
    };
  };
  from(table: "component_translations"): {
    upsert(rows: HandRow[], opts: { onConflict: string }): WriteResult;
    update(patch: { source_hash: string }): Scoped;
    delete(): Scoped;
  };
};

/** The Component's Source text, if it exists and this Seller owns it. */
export async function loadOwnedSource(
  supabase: SellerTranslationsDb,
  componentId: string,
  sellerId: string
): Promise<Result<{ source: ComponentSource }>> {
  const { data } = await supabase
    .from("components")
    .select("seller_id, source_language, description, readme")
    .eq("id", componentId)
    .maybeSingle();
  if (!data) return { ok: false, status: 404, error: "notFound" };
  if (!isOwnedBySeller(data, sellerId)) return { ok: false, status: 403, error: "notOwner" };
  return { ok: true, source: data };
}

/**
 * Stores the Seller's own words as hand Translations, made from the current
 * Source text. A hand row is never overwritten by the job; it goes stale
 * when the Source text changes. Only a Locale the source needs translating
 * into takes a Translation.
 */
export async function saveHandTranslations(
  supabase: SellerTranslationsDb,
  { componentId, sellerId, input }: { componentId: string; sellerId: string; input: HandTranslationInput }
): Promise<Result> {
  const owned = await loadOwnedSource(supabase, componentId, sellerId);
  if (!owned.ok) return owned;
  if (!targetLocales(sourceLanguageOf(owned.source)).includes(input.locale)) {
    return { ok: false, status: 400, error: "translationLocaleInvalid" };
  }

  // A field with no Source text has nothing to translate.
  const rows = TRANSLATED_FIELDS.flatMap((field) => {
    const text = input.texts[field];
    if (text === undefined || !owned.source[field]?.trim()) return [];
    return [{
      component_id: componentId,
      locale: input.locale,
      field,
      text,
      kind: "hand" as const,
      status: "ready" as const,
      failure_reason: null,
      source_hash: sourceHash(owned.source[field] ?? ""),
    }];
  });
  if (!rows.length) return { ok: false, status: 400, error: "translationEmpty" };
  const { error } = await supabase.from("component_translations").upsert(rows, { onConflict: "component_id,locale,field" });
  if (error) {
    console.error("saveHandTranslations failed:", error.message);
    return { ok: false, status: 500, error: "translationSaveFailed" };
  }
  return { ok: true };
}

/**
 * Discards a hand edit so the job makes a fresh machine Translation: the
 * caller queues the job afterwards. Both "Reset to machine translation" and
 * a stale field's "Re-translate" end here.
 */
export async function resetToMachine(
  supabase: SellerTranslationsDb,
  { componentId, sellerId, input }: { componentId: string; sellerId: string; input: ResetInput }
): Promise<Result> {
  const owned = await loadOwnedSource(supabase, componentId, sellerId);
  if (!owned.ok) return owned;

  const { error } = await supabase
    .from("component_translations")
    .delete()
    .eq("component_id", componentId)
    .eq("locale", input.locale)
    .eq("field", input.field)
    .eq("kind", "hand");
  if (error) {
    console.error("resetToMachine failed:", error.message);
    return { ok: false, status: 500, error: "translationActionFailed" };
  }
  return { ok: true };
}

/**
 * After the Seller changes the declared source language, every Translation
 * was made from a different source: machine rows are redone by the next
 * job, hand rows are kept and show as stale. The hash records which source
 * a row was made from, so clearing it says exactly that.
 */
export async function markSourceLanguageChanged(supabase: SellerTranslationsDb, componentId: string): Promise<void> {
  const { error } = await supabase.from("component_translations").update({ source_hash: "" }).eq("component_id", componentId);
  if (error) console.error("markSourceLanguageChanged failed:", error.message);
}
