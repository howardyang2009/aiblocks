import type { ComponentType } from "react";
import type { Metadata } from "next";
import { routing, type Locale } from "./routing";

/**
 * A long-form page's copy in one Locale: `content.{locale}.tsx` next to the
 * route's `page.tsx`, exporting the page body and its metadata (#44).
 */
export type PageContent = { default: ComponentType; metadata: Metadata };

/** One content file per Locale, so a missing Locale fails typecheck. */
export type LocalizedPage = Record<Locale, PageContent>;

const CONTENT_FILE = /^(.*\/)?content\.([^/]+)\.tsx$/;

/**
 * Given file paths, returns the `content.{locale}.tsx` paths that are missing:
 * every directory holding one content file must hold one for every Locale.
 */
export function missingContentFiles(files: string[]): string[] {
  const present = new Set(files);
  const dirs = new Set(
    files.flatMap((file) => {
      const match = file.match(CONTENT_FILE);
      return match ? [match[1] ?? ""] : [];
    }),
  );
  return [...dirs]
    .flatMap((dir) => routing.locales.map((locale) => `${dir}content.${locale}.tsx`))
    .filter((file) => !present.has(file))
    .sort();
}
