import { hasLocale } from "next-intl";
import { localeFromPathname, localePrefix, routing, type Locale } from "./routing";

/** The parts of a page URL a Locale switch keeps. */
export type PageLocation = Pick<Location, "pathname" | "search" | "hash">;

/**
 * The same page in another Locale: swaps the Locale prefix and keeps path,
 * query string and hash (#42), e.g. `/en/browse?q=agent#results` to
 * `/de/browse?q=agent#results`.
 */
export function switchLocaleHref({ pathname, search, hash }: PageLocation, target: Locale): string {
  const current = localeFromPathname(pathname);
  const rest = current ? pathname.slice(localePrefix(current).length) : pathname;
  return localePrefix(target) + rest + search + hash;
}

/**
 * Where a page request goes when the remembered Locale cookie names another
 * Locale than the URL prefix: the same path under the remembered Locale.
 * Undefined when the page may render as is (no prefix, no valid cookie, or
 * they already agree). Without this, the back button through `/de` would
 * overwrite a choice of Chinese made one page later.
 */
export function rememberedLocalePath(pathname: string, cookie: string | undefined): string | undefined {
  const current = localeFromPathname(pathname);
  if (!current || !cookie || !hasLocale(routing.locales, cookie) || cookie === current) return undefined;
  return switchLocaleHref({ pathname, search: "", hash: "" }, cookie);
}
