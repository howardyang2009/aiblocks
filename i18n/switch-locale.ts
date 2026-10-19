import { localeFromPathname, localePrefix, type Locale } from "./routing";

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
