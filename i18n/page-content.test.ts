import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { missingContentFiles } from "./page-content";

const appDir = path.resolve(__dirname, "../app");
const appFiles = (readdirSync(appDir, { recursive: true }) as string[]).map((f) => f.split(path.sep).join("/"));

describe("missingContentFiles", () => {
  it("finds nothing missing when every page has a file per Locale", () => {
    const files = ["about/content.de.tsx", "about/content.en.tsx", "about/content.zh-CN.tsx"];
    expect(missingContentFiles(files)).toEqual([]);
  });

  it("names the file a page is missing for one Locale", () => {
    const files = [
      "about/content.de.tsx",
      "about/content.en.tsx",
      "about/content.zh-CN.tsx",
      "docs/seller/publish/content.de.tsx",
      "docs/seller/publish/content.en.tsx",
    ];
    expect(missingContentFiles(files)).toEqual(["docs/seller/publish/content.zh-CN.tsx"]);
  });

  it("ignores files that are not content files", () => {
    expect(missingContentFiles(["about/page.tsx", "about/notes.de.md"])).toEqual([]);
  });
});

describe("long-form page content", () => {
  it("has a content file for every Locale on every page", () => {
    expect(missingContentFiles(appFiles)).toEqual([]);
  });

  it.each(["about", "contact", "docs/seller/publish", "docs/seller/stripe"])("%s is a per-Locale content page", (page) => {
    expect(appFiles).toContain(`[locale]/(public)/${page}/content.en.tsx`);
  });
});
