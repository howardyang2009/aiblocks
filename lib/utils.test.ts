import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/utils";

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
