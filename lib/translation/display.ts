import type { Locale } from "@/i18n/routing";
import type { ComponentSummary } from "@/types/database";
import { sourceLanguageOf, type ComponentSource, type TranslatedField } from "./plan";
import type { SourceLanguage } from "./source-language";

// What readers see of a Component's Source text in a Locale (ADR 0006, #70).

/** The parts of a `component_translations` row a reader-facing page needs. */
export type DisplayRow = { locale: string; field: string; kind: string; status: string; text: string | null };

/** The text to show, and the source language when it is a machine Translation. */
export type ShownText = { text: string; machineTranslatedFrom: SourceLanguage | null };

/**
 * The ready Translation for the Locale, machine or hand, stale or not;
 * otherwise the Source text. The Locale the source is written in always
 * shows the Source text. Only a machine Translation is labelled.
 */
export function shownText(
  source: ComponentSource,
  rows: DisplayRow[],
  locale: Locale,
  field: TranslatedField
): ShownText {
  const language = sourceLanguageOf(source);
  const translation =
    language === locale
      ? undefined
      : rows.find((r) => r.locale === locale && r.field === field && r.status === "ready" && r.text !== null);
  if (!translation) return { text: source[field] ?? "", machineTranslatedFrom: null };
  return { text: translation.text!, machineTranslatedFrom: translation.kind === "machine" ? language : null };
}

const DISPLAY_COLS = "component_id, locale, field, kind, status, text";

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

/** A Component's description and readme as shown in the Locale: the detail page and its metadata. */
export async function loadShownText(
  supabase: DisplayDb,
  component: ComponentSource & { id: string },
  locale: Locale
): Promise<Record<TranslatedField, ShownText>> {
  const rows =
    sourceLanguageOf(component) === locale
      ? []
      : ((
          await supabase
            .from("component_translations")
            .select(DISPLAY_COLS)
            .in("component_id", [component.id])
            .eq("locale", locale)
        ).data ?? []);
  return {
    description: shownText(component, rows, locale, "description"),
    readme: shownText(component, rows, locale, "readme"),
  };
}
