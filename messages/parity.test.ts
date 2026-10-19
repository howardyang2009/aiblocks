import { describe, it, expect } from "vitest";
import { keyDifferences } from "@/i18n/message-keys";
import { routing } from "@/i18n/routing";
import { COMPONENT_WRITE_ERRORS } from "@/lib/commerce/component-write-errors";
import en from "./en.json";
import de from "./de.json";
import zhCN from "./zh-CN.json";

// `en` is the Source copy: every other Locale must have exactly its keys.
const byLocale: Record<string, object> = { de, en, "zh-CN": zhCN };

describe("message key parity", () => {
  it("has a message file for every Locale", () => {
    expect(Object.keys(byLocale).sort()).toEqual([...routing.locales].sort());
  });

  for (const locale of routing.locales.filter((l) => l !== "en")) {
    it(`${locale} has the same keys as en`, () => {
      expect(keyDifferences(en, byLocale[locale])).toEqual({ missing: [], extra: [] });
    });
  }
});

describe("Component form error messages", () => {
  it("has an en message for every Component write error key", () => {
    const errors = en.ComponentForm.errors as Record<string, string>;
    expect(COMPONENT_WRITE_ERRORS.filter((key) => !errors[key])).toEqual([]);
  });
});
