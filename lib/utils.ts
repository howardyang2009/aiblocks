import type { Locale } from "@/i18n/routing";

// Absolute medium date in the page's Locale (#67): `19.10.2026` in `de`,
// `Oct 19, 2026` in `en`, `2026年10月19日` in `zh-CN`. Fixed to Berlin time so
// server and browser render the same day.
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(iso));
}

// A count (stars, downloads) with the Locale's digit grouping.
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(n);
}

// An average rating with exactly one decimal: `4,5` in `de`, `4.5` in `en`.
export function formatRating(average: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average);
}

// A file size in megabytes with two decimals: `1,23 MB` in `de`.
export function formatFileSize(bytes: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "megabyte",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bytes / 1024 / 1024);
}

// Format integer cents as money in the page's Locale (#67): `12,50 €` in
// `de`, `€12.50` in `en` and `zh-CN`. Never converts the amount. A Free
// Component's label is translated copy, so callers handle price zero.
export function formatPrice(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// True when a component's price is zero — free to download without purchase.
export function isFreeComponent(priceCents: number): boolean {
  return priceCents === 0;
}

// Lowercase + trim a free-form tag so "Claude" and "claude" converge.
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

// Turn a component name into a URL-friendly slug fragment.
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "component"
  );
}

// Split a comma/space separated string into a clean, deduped, lowercased list.
export function parseList(input: string | string[] | undefined): string[] {
  const raw = Array.isArray(input) ? input.join(",") : input ?? "";
  const seen = new Set<string>();
  for (const part of raw.split(/[,\n]/)) {
    const v = part.trim().toLowerCase();
    if (v) seen.add(v);
  }
  return [...seen];
}
