import type { Locale } from "@/i18n/routing";

// Format an ISO date string to "Jan 1, 2025" (matches toLocaleDateString used
// in comments and reviews).
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
