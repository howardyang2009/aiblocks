import { hasLocale } from "next-intl";
import { APP_URL } from "@/lib/constants";
import { localePrefix, routing, type Locale } from "@/i18n/routing";

/** A Locale sent by the client, or the default `de` when missing or not allowed (#60). */
export function parseLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** Absolute URL of a page in a Locale, for links that leave the site (Stripe). */
export function localeUrl(locale: Locale, path: string): string {
  return `${APP_URL}${localePrefix(locale)}${path}`;
}
