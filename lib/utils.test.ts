import { describe, it, expect } from "vitest";
import { formatDate, formatFileSize, formatNumber, formatPrice, formatRating } from "@/lib/utils";

// Intl puts a no-break space between number and symbol in `de`.
const nbsp = "\u00a0";

describe("formatPrice", () => {
  it.each([
    ["de", `12,50${nbsp}€`],
    ["en", "€12.50"],
    ["zh-CN", "€12.50"],
  ] as const)("formats euros in %s", (locale, expected) => {
    expect(formatPrice(1250, "eur", locale)).toBe(expected);
  });

  it("keeps the amount and currency, only the number format follows the Locale", () => {
    expect(formatPrice(500, "usd", "en")).toBe("$5.00");
    expect(formatPrice(500, "usd", "de")).toBe(`5,00${nbsp}$`);
  });
});

describe("formatDate", () => {
  // 22:30 UTC is already the next day in Berlin: the date must not depend on
  // the server's or the browser's own time zone.
  const iso = "2026-10-18T22:30:00Z";

  it.each([
    ["de", "19.10.2026"],
    ["en", "Oct 19, 2026"],
    ["zh-CN", "2026年10月19日"],
  ] as const)("formats an absolute medium date in Europe/Berlin for %s", (locale, expected) => {
    expect(formatDate(iso, locale)).toBe(expected);
  });
});

describe("formatNumber", () => {
  it.each([
    ["de", "12.345"],
    ["en", "12,345"],
    ["zh-CN", "12,345"],
  ] as const)("groups digits for %s", (locale, expected) => {
    expect(formatNumber(12345, locale)).toBe(expected);
  });
});

describe("formatRating", () => {
  it.each([
    ["de", "4,5"],
    ["en", "4.5"],
    ["zh-CN", "4.5"],
  ] as const)("shows one decimal for %s", (locale, expected) => {
    expect(formatRating(4.45, locale)).toBe(expected);
  });

  it("keeps the decimal on a whole rating", () => {
    expect(formatRating(4, "de")).toBe("4,0");
  });
});

describe("formatFileSize", () => {
  it.each([
    ["de", "1,23 MB"],
    ["en", "1.23 MB"],
  ] as const)("shows megabytes with two decimals for %s", (locale, expected) => {
    expect(formatFileSize(1.234 * 1024 * 1024, locale)).toBe(expected);
  });
});
