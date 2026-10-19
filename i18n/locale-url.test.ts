import { describe, it, expect } from "vitest";
import { localeUrl, parseLocale } from "@/i18n/locale-url";
import { APP_URL } from "@/lib/constants";

describe("parseLocale", () => {
  it("accepts each allowed Locale", () => {
    expect(parseLocale("de")).toBe("de");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("zh-CN")).toBe("zh-CN");
  });

  it("falls back to de for a missing or invalid value", () => {
    expect(parseLocale(undefined)).toBe("de");
    expect(parseLocale(null)).toBe("de");
    expect(parseLocale("")).toBe("de");
    expect(parseLocale("fr")).toBe("de");
    expect(parseLocale("zh")).toBe("de");
    expect(parseLocale(42)).toBe("de");
  });
});

describe("localeUrl", () => {
  it("builds an absolute URL under the Locale's prefix", () => {
    expect(localeUrl("de", "/terms#refunds")).toBe(`${APP_URL}/de/terms#refunds`);
    expect(localeUrl("zh-CN", "/components/c1?paid=1")).toBe(`${APP_URL}/zh/components/c1?paid=1`);
  });
});
