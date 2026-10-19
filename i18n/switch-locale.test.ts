import { describe, it, expect } from "vitest";
import { switchLocaleHref } from "@/i18n/switch-locale";

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
