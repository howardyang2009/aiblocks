import { describe, it, expect } from "vitest";
import { rememberedLocalePath, switchLocaleHref } from "@/i18n/switch-locale";

describe("switchLocaleHref", () => {
  it("swaps the Locale prefix and keeps path, query and hash", () => {
    const here = { pathname: "/en/browse", search: "?q=agent", hash: "#results" };
    expect(switchLocaleHref(here, "de")).toBe("/de/browse?q=agent#results");
  });

  it("uses the short /zh prefix for zh-CN and reads it back", () => {
    expect(switchLocaleHref({ pathname: "/de/components/x", search: "", hash: "" }, "zh-CN")).toBe("/zh/components/x");
    expect(switchLocaleHref({ pathname: "/zh/browse", search: "?tag=x", hash: "" }, "en")).toBe("/en/browse?tag=x");
  });

  it("handles a bare Locale home with or without a trailing slash", () => {
    expect(switchLocaleHref({ pathname: "/de", search: "", hash: "" }, "en")).toBe("/en");
    expect(switchLocaleHref({ pathname: "/de/", search: "", hash: "" }, "en")).toBe("/en/");
  });

  it("prefixes an unprefixed path instead of replacing its first segment", () => {
    expect(switchLocaleHref({ pathname: "/browse", search: "", hash: "" }, "en")).toBe("/en/browse");
    expect(switchLocaleHref({ pathname: "/", search: "", hash: "" }, "zh-CN")).toBe("/zh/");
  });
});

describe("rememberedLocalePath", () => {
  it("moves a page to the remembered Locale, keeping the path", () => {
    expect(rememberedLocalePath("/de/browse", "zh-CN")).toBe("/zh/browse");
    expect(rememberedLocalePath("/zh", "en")).toBe("/en");
  });

  it("leaves the page alone when cookie and prefix agree", () => {
    expect(rememberedLocalePath("/zh/browse", "zh-CN")).toBeUndefined();
  });

  it("leaves the page alone without a valid cookie or a prefix", () => {
    expect(rememberedLocalePath("/de/browse", undefined)).toBeUndefined();
    expect(rememberedLocalePath("/de/browse", "zh")).toBeUndefined();
    expect(rememberedLocalePath("/", "en")).toBeUndefined();
  });
});
