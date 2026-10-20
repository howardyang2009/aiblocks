import { routing, type Locale } from "@/i18n/routing";

// No I/O and no Node APIs, so the client Component form can import it.

/** The language a Seller declares their Source text is written in (ADR 0006). */
export type SourceLanguage = Locale | "other";

const SOURCE_LANGUAGES: readonly SourceLanguage[] = [...routing.locales, "other"];

/** A declared source language from untrusted input, or null when it is not one. */
export function parseSourceLanguage(value: unknown): SourceLanguage | null {
  return SOURCE_LANGUAGES.find((language) => language === value) ?? null;
}
