import type { Locale } from "@/i18n/routing";

export type LegalPageKind = "impressum" | "privacy" | "terms";

/**
 * What a Legal page's content file says about its own version: when it was
 * last updated (`YYYY-MM-DD`), and, for `de`, whether it is still a draft
 * awaiting review (ADR 0004).
 */
export type LegalVersion = { lastUpdated: string; draft?: boolean };

export type LegalNoticeFlags = {
  /** The `de` master is an unreviewed draft. */
  draft: boolean;
  /** Only the German version is binding; the Impressum states facts, not terms. */
  binding: boolean;
  /** This translation predates the latest change to `de`. */
  behind: boolean;
};

/** Which notices a Legal page shows in a Locale, given every version of it. */
export function legalNotices(
  kind: LegalPageKind,
  locale: Locale,
  versions: Record<Locale, LegalVersion>,
): LegalNoticeFlags {
  const master = locale === "de";
  return {
    draft: master && versions.de.draft === true,
    binding: !master && kind !== "impressum",
    // ISO dates compare correctly as strings.
    behind: !master && versions[locale].lastUpdated < versions.de.lastUpdated,
  };
}
