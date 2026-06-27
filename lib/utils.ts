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
