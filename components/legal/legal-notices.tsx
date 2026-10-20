import type { ComponentType, ReactNode } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { legalNotices, type LegalPageKind, type LegalVersion } from "@/lib/legal";
import { LegalCallout } from "./legal-page";

/**
 * A Legal page's copy in one Locale: `content.{locale}.tsx` next to the
 * route, exporting its body and version (ADR 0004). The body
 * places `notices` under its heading.
 */
export type LegalContent = LegalVersion & {
  default: ComponentType<{ notices: ReactNode }>;
};

/**
 * The last-updated date of this Locale's version, plus the draft, binding
 * and behind notices that apply to it.
 */
export async function LegalNotices({
  kind,
  versions,
}: {
  kind: LegalPageKind;
  versions: Record<Locale, LegalVersion>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Legal");
  const format = await getFormatter();
  const notices = legalNotices(kind, locale, versions);

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long", timeZone: "UTC" });
  const german = (chunks: ReactNode) => (
    <Link href={`/${kind}`} locale="de" className="underline underline-offset-2 hover:text-ink">
      {chunks}
    </Link>
  );

  return (
    <>
      <p className="eyebrow mt-3">{t("lastUpdated", { date: date(versions[locale].lastUpdated) })}</p>
      {notices.draft && <LegalCallout>{t("draft")}</LegalCallout>}
      {notices.binding && <LegalCallout>{t.rich("binding", { german })}</LegalCallout>}
      {notices.behind && (
        <LegalCallout>{t.rich("behind", { date: date(versions.de.lastUpdated), german })}</LegalCallout>
      )}
    </>
  );
}
