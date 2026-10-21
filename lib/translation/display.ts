import type { Locale } from "@/i18n/routing";
import type { ComponentSummary } from "@/types/database";
import { fieldState, sourceLanguageOf, type ComponentSource, type TranslatedField } from "./plan";
import type { SourceLanguage } from "./source-language";

// What readers see of a Component's Source text in a Locale (ADR 0006, #70).

/** The parts of a `component_translations` row a reader-facing page needs. */
export type DisplayRow = {
  locale: string;
  field: string;
  kind: string;
  status: string;
  source_hash: string;
  failure_reason: string | null;
  text: string | null;
};

/** The text to show, and the source language when it is a machine Translation. */
export type ShownText = { text: string; machineTranslatedFrom: SourceLanguage | null };

/**
 * A hand-edited Translation (stale or not: it is the Seller's own words) or
 * a machine Translation of the CURRENT Source text; otherwise the Source
 * text. A machine row of an older Source text is never shown, even when the
 * job that should redo it never ran. The Locale the source is written in
 * always shows the Source text. Only a machine Translation is labelled.
 */
export function shownText(
  source: ComponentSource,
  rows: DisplayRow[],
  locale: Locale,
  field: TranslatedField
): ShownText {
  const language = sourceLanguageOf(source);
  const sourceText = source[field] ?? "";
  const row = language === locale ? undefined : rows.find((r) => r.locale === locale && r.field === field);
  const state = row && row.text !== null ? fieldState(row, sourceText) : null;
  const translation = state === "machine" || state === "hand" || state === "stale" ? row : undefined;
  if (!translation) return { text: sourceText, machineTranslatedFrom: null };
  return { text: translation.text!, machineTranslatedFrom: translation.kind === "machine" ? language : null };
}

const DISPLAY_COLS = "component_id, locale, field, kind, status, source_hash, failure_reason, text";

/** A card's Component with its description shown in the page's Locale. */
export type LocalizedSummary = ComponentSummary & { machineTranslatedFrom: SourceLanguage | null };

type TranslationsQuery = PromiseLike<{ data: (DisplayRow & { component_id: string })[] | null }> & {
  eq(column: string, value: string): TranslationsQuery;
};

export type DisplayDb = {
  from(table: "component_translations"): {
    select(columns: string): {
      in(column: string, values: string[]): TranslationsQuery;
    };
  };
};

/** Shows each card's description in the Locale: one query for the whole list. */
export async function localizeSummaries(
  supabase: DisplayDb,
  components: ComponentSummary[],
  locale: Locale
): Promise<LocalizedSummary[]> {
  if (!components.length) return [];
  const { data } = await supabase
    .from("component_translations")
    .select(DISPLAY_COLS)
    .in("component_id", components.map((c) => c.id))
    .eq("locale", locale)
    .eq("field", "description")
    .eq("status", "ready");
  const rows = data ?? [];
  return components.map((c) => {
    const shown = shownText(
      { ...c, readme: null },
      rows.filter((r) => r.component_id === c.id),
      locale,
      "description"
    );
    return { ...c, description: shown.text, machineTranslatedFrom: shown.machineTranslatedFrom };
  });
}

/**
 * A Component's Translation rows in the Locale, keyed by id alone so the
 * detail page can start this query together with the Component lookup.
 * In the Locale the source is written in the rows are fetched but unused:
 * shownText ignores them there.
 */
export async function loadTranslationRows(supabase: DisplayDb, componentId: string, locale: Locale): Promise<DisplayRow[]> {
  const { data } = await supabase
    .from("component_translations")
    .select(DISPLAY_COLS)
    .in("component_id", [componentId])
    .eq("locale", locale);
  return data ?? [];
}

/** A Component's description and readme as shown in the Locale: the detail page and its metadata. */
export function shownTexts(
  component: ComponentSource,
  rows: DisplayRow[],
  locale: Locale
): Record<TranslatedField, ShownText> {
  return {
    description: shownText(component, rows, locale, "description"),
    readme: shownText(component, rows, locale, "readme"),
  };
}
