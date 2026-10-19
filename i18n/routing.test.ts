import { describe, it, expect } from "vitest";
import { localeFromPathname, routing } from "@/i18n/routing";

describe("localeFromPathname", () => {
  it("reads each Locale from its URL prefix", () => {
    expect(localeFromPathname("/de/dashboard")).toBe("de");
    expect(localeFromPathname("/en/browse")).toBe("en");
    expect(localeFromPathname("/zh/dashboard/downloads")).toBe("zh-CN");
  });

  it("reads a bare prefix with no trailing path", () => {
    expect(localeFromPathname("/zh")).toBe("zh-CN");
    expect(localeFromPathname("/en/")).toBe("en");
  });

  it("returns undefined for an unprefixed doorway URL", () => {
    expect(localeFromPathname("/")).toBeUndefined();
    expect(localeFromPathname("/dashboard")).toBeUndefined();
    expect(localeFromPathname("/english/page")).toBeUndefined();
  });

  it("does not treat the internal zh-CN id as a URL prefix", () => {
    expect(localeFromPathname("/zh-CN/browse")).toBeUndefined();
  });
});

describe("routing", () => {
  it("defaults to de and lists the three Locales", () => {
    expect(routing.defaultLocale).toBe("de");
    expect([...routing.locales]).toEqual(["de", "en", "zh-CN"]);
  });
});
