import { describe, it, expect } from "vitest";
import { keyDifferences } from "@/i18n/message-keys";

describe("keyDifferences", () => {
  it("finds nothing when both trees have the same keys", () => {
    const source = { Nav: { browse: "Browse", nested: { a: "A" } } };
    const target = { Nav: { browse: "Durchsuchen", nested: { a: "Ä" } } };
    expect(keyDifferences(source, target)).toEqual({ missing: [], extra: [] });
  });

  it("reports keys missing from the target as dotted paths", () => {
    const source = { Nav: { browse: "Browse", signIn: "Sign in" }, Footer: { about: "About" } };
    const target = { Nav: { browse: "Durchsuchen" } };
    expect(keyDifferences(source, target)).toEqual({
      missing: ["Footer.about", "Nav.signIn"],
      extra: [],
    });
  });

  it("reports keys the target has but the source lacks", () => {
    const source = { Nav: { browse: "Browse" } };
    const target = { Nav: { browse: "Durchsuchen", old: "Alt" } };
    expect(keyDifferences(source, target)).toEqual({ missing: [], extra: ["Nav.old"] });
  });

  it("treats a namespace replaced by a string as a mismatch", () => {
    const source = { Nav: { browse: "Browse" } };
    const target = { Nav: "Navigation" };
    expect(keyDifferences(source, target)).toEqual({ missing: ["Nav.browse"], extra: ["Nav"] });
  });
});
