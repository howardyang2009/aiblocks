import { defineRouting } from "next-intl/routing";

// Every page URL carries its Locale prefix, `de` included (ADR 0003). The
// `zh-CN` Locale is served under the shorter `/zh` prefix; `<html lang>`,
// hreflang and the message file keep the full `zh-CN` id.
const prefixes = {
  de: "/de",
  en: "/en",
  "zh-CN": "/zh",
} as const;

export const routing = defineRouting({
  locales: ["de", "en", "zh-CN"],
  defaultLocale: "de",
  localePrefix: { mode: "always", prefixes },
  // Remembered choice for the unprefixed doorway URL (#42): one year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

/** The URL prefix (`/de`, `/en`, `/zh`) for a Locale. */
export function localePrefix(locale: Locale): string {
  return prefixes[locale];
}

/** The Locale named by a pathname's prefix, or undefined for a doorway URL. */
export function localeFromPathname(pathname: string): Locale | undefined {
  const segment = "/" + (pathname.split("/")[1] ?? "");
  return routing.locales.find((locale) => prefixes[locale] === segment);
}
