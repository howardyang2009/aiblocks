// Format integer cents into a display price. 0 cents => "Free".
export function formatPrice(cents: number, currency = "usd"): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
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
