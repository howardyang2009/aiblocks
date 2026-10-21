import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  ComponentViewerProvider,
  ViewerComments,
  ViewerDownload,
  ViewerEditLink,
  ViewerReviews,
  ViewerStarButton,
} from "@/components/component-viewer";
import { Price } from "@/components/price";
import { MachineTranslatedField } from "@/components/machine-translation";
import { formatNumber, formatRating } from "@/lib/utils";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/commerce/components";
import { narrowDb } from "@/lib/db-port";
import { canonical, componentPath, truncateDescription } from "@/lib/seo";
import { loadTranslationRows, shownTexts, type DisplayDb } from "@/lib/translation/display";
import { fetchComponentRows, buildComponentView } from "./view-model";

// Rendered for no one in particular and cached: served from the CDN,
// rebuilt in the background at most every 5 minutes, and dropped at once by
// every route that changes what it shows (lib/component-page-cache.ts). The
// Viewer's Star, ownership, Seller controls and own Reviews and Comments
// come from the browser (components/component-viewer.tsx). Pages are built
// on first request; an empty list prerenders none at build time.
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

// One lookup per request, shared by generateMetadata and the page (the
// seller profile page does the same): both need the published row and its
// Translation rows, and Next renders them as separate Server Components.
// Both are keyed by the id from the URL (and the Locale), so they start
// together instead of the Translation query waiting for the row.
const getComponent = cache((id: string) =>
  getPublishedComponent(narrowDb<PublishedComponentDb>(createServiceClient()), id)
);
const getTranslationRows = cache((id: string, locale: Awaited<ReturnType<typeof getLocale>>) =>
  loadTranslationRows(narrowDb<DisplayDb>(createServiceClient()), id, locale)
);

// The Component's name as submitted; its description as shown in the
// page's Locale, the same text the page itself shows (#70).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const [component, translationRows] = await Promise.all([getComponent(id), getTranslationRows(id, locale)]);
  if (!component) return {};
  const { description } = shownTexts(component, translationRows, locale);
  return {
    title: component.name,
    description: truncateDescription(description.text),
    alternates: canonical(locale, componentPath(component.id)),
  };
}

export default async function ComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  // Everything is keyed by the id, so every Supabase query starts now,
  // alongside the published-component lookup.
  const [component, translationRows, rows, t] = await Promise.all([
    getComponent(id),
    getTranslationRows(id, locale),
    fetchComponentRows(createServiceClient(), id),
    getTranslations("ComponentPage"),
  ]);
  if (!component) notFound();

  const shown = shownTexts(component, translationRows, locale);
  const { seller, tags, reviews, reviewCount, avgRating, unloadedRatings, commentTree } = buildComponentView({ component, ...rows });
  const renderReadme = (readme: string) =>
    readme.trim() ? <MarkdownRenderer source={readme} /> : <p className="text-sm text-subtle">{t("noReadme")}</p>;

  return (
    <ComponentViewerProvider componentId={component.id}>
      <div className="mx-auto max-w-shell px-5 py-10 grid lg:grid-cols-[1fr_320px] gap-10">
        <article>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="font-display font-bold text-3xl mt-2">{component.name}</h1>
          <MachineTranslatedField
            shown={<p className="text-muted mt-2">{shown.description.text}</p>}
            source={<p className="text-muted mt-2">{component.description}</p>}
            machineTranslatedFrom={shown.description.machineTranslatedFrom}
          />
          {seller && (
            <p className="text-sm text-subtle mt-3">
              {t.rich("by", {
                username: seller.username,
                seller: (chunks) => (
                  <Link href={`/sellers/${seller.username}`} className="text-accent hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {component.ecosystems?.map((e: string) => (
              <span key={e} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">{e}</span>
            ))}
            {tags.map((t) => (
              <Link key={t} href={`/browse?tag=${encodeURIComponent(t)}`}
                className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle hover:border-accent">
                #{t}
              </Link>
            ))}
          </div>

          <hr className="my-8" />
          <MachineTranslatedField
            shown={renderReadme(shown.readme.text)}
            source={renderReadme(component.readme ?? "")}
            machineTranslatedFrom={shown.readme.machineTranslatedFrom}
          />

          <hr className="my-8" />
          <ViewerReviews
            componentId={component.id}
            reviews={reviews}
            unloadedRatings={unloadedRatings}
            sellerUsername={seller?.username ?? null}
          />

          <hr className="my-8" />
          <ViewerComments componentId={component.id} comments={commentTree} />
        </article>

        <aside className="lg:sticky lg:top-8 h-fit rounded-block border bg-surface p-5">
          <p className="font-mono text-2xl"><Price cents={component.price_cents} currency={component.currency} /></p>
          <ViewerDownload componentId={component.id} priceCents={component.price_cents} />
          <div className="mt-4">
            <ViewerStarButton componentId={component.id} count={component.star_count} />
          </div>
          <ViewerEditLink componentId={component.id} />
          <dl className="mt-6 space-y-2 font-mono text-xs text-subtle">
            <div className="flex justify-between"><dt>{t("downloads")}</dt><dd>{formatNumber(component.download_count, locale)}</dd></div>
            <div className="flex justify-between"><dt>{t("stars")}</dt><dd>{formatNumber(component.star_count, locale)}</dd></div>
            <div className="flex justify-between">
              <dt>{t("rating")}</dt>
              <dd>
                {avgRating !== null ? (
                  <a href="#reviews" className="hover:text-accent">
                    {formatRating(avgRating, locale)} ({formatNumber(reviewCount, locale)})
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </ComponentViewerProvider>
  );
}
