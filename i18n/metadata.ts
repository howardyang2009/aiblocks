import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageSeo, type MetadataPage } from "@/lib/seo";

/**
 * A static page's translated title and description from the `Metadata`
 * messages, plus its canonical or `noindex` (#68).
 */
export async function pageMetadata(page: MetadataPage): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t(`${page}.title`), description: t(`${page}.description`), ...pageSeo(page, await getLocale()) };
}
