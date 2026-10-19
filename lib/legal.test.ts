import { describe, it, expect } from "vitest";
import { legalNotices } from "./legal";

const current = {
  de: { lastUpdated: "2026-10-19", draft: true },
  en: { lastUpdated: "2026-10-19" },
  "zh-CN": { lastUpdated: "2026-10-19" },
};

describe("legalNotices", () => {
  it("marks the de draft as a draft and nothing else", () => {
    expect(legalNotices("terms", "de", current)).toEqual({ draft: true, binding: false, behind: false });
  });

  it("shows no draft notice once de is reviewed", () => {
    const reviewed = { ...current, de: { lastUpdated: "2026-10-19" } };
    expect(legalNotices("privacy", "de", reviewed).draft).toBe(false);
  });

  it("says only the German version binds on translated terms and privacy", () => {
    expect(legalNotices("terms", "en", current)).toEqual({ draft: false, binding: true, behind: false });
    expect(legalNotices("privacy", "zh-CN", current).binding).toBe(true);
  });

  it("shows no binding notice on the Impressum", () => {
    expect(legalNotices("impressum", "en", current).binding).toBe(false);
  });

  it("says a translation is behind when de was updated after it", () => {
    const deMoved = { ...current, de: { lastUpdated: "2026-11-02" } };
    expect(legalNotices("terms", "zh-CN", deMoved).behind).toBe(true);
    expect(legalNotices("impressum", "en", deMoved).behind).toBe(true);
    expect(legalNotices("terms", "de", deMoved).behind).toBe(false);
  });
});
