import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { ReviewsSection } from "@/components/reviews-section";
import { CommentsSection } from "@/components/comments-section";
import { Price } from "@/components/price";
import { MachineTranslatedField } from "@/components/machine-translation";
import { formatNumber, formatRating } from "@/lib/utils";
import { getViewer } from "@/lib/identity/viewer";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/commerce/components";
import { narrowDb } from "@/lib/db-port";
import { canonical, componentPath, truncateDescription } from "@/lib/seo";
import { loadShownText, type DisplayDb } from "@/lib/translation/display";
import { fetchComponentRows, buildComponentView } from "./view-model";

export const dynamic = "force-dynamic";

// The Component's name as submitted; its description as shown in the
// page's Locale, the same text the page itself shows (#70).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const component = await getPublishedComponent(narrowDb<PublishedComponentDb>(supabase), id);
  if (!component) return {};
  const locale = await getLocale();
  const { description } = await loadShownText(narrowDb<DisplayDb>(supabase), component, locale);
  return {
    title: component.name,
    description: truncateDescription(description.text),
    alternates: canonical(locale, componentPath(component.id)),
  };
}

export default async function ComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile: viewerProfile } = await getViewer();
  const supabase = createServiceClient();
  const rows = await fetchComponentRows(supabase, id, viewerProfile);
  if (!rows) notFound();
  const data = buildComponentView(rows, viewerProfile);

  const t = await getTranslations("ComponentPage");
  const locale = await getLocale();
  const { component, seller, tags, starred, owned, viewer, isSeller, reviews, reviewCount, avgRating, commentTree } = data;
  const shown = await loadShownText(narrowDb<DisplayDb>(supabase), component, locale);
  const renderReadme = (readme: string) =>
    readme.trim() ? <MarkdownRenderer source={readme} /> : <p className="text-sm text-subtle">{t("noReadme")}</p>;

  return (
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
        <ReviewsSection
          componentId={component.id}
          initialReviews={reviews}
          canReview={owned && !isSeller}
          signedIn={!!viewerProfile}
          isSeller={isSeller}
          sellerUsername={seller?.username ?? null}
        />

        <hr className="my-8" />
        <CommentsSection
          componentId={component.id}
          initialComments={commentTree}
          signedIn={!!viewerProfile}
          viewer={viewer}
          isSeller={isSeller}
        />
      </article>

      <aside className="lg:sticky lg:top-8 h-fit rounded-block border bg-surface p-5">
        <p className="font-mono text-2xl"><Price cents={component.price_cents} currency={component.currency} /></p>
        {owned && component.price_cents > 0 && (
          <p className="font-mono text-[11px] text-free mt-1">{t("purchased")}</p>
        )}
        <div className="mt-4">
          <DownloadButton
            componentId={component.id}
            priceCents={component.price_cents}
            owned={owned}
            signedIn={!!viewerProfile}
          />
        </div>
        <div className="mt-4">
          <StarButton componentId={component.id} initialCount={component.star_count} initialStarred={starred} />
        </div>
        {isSeller && (
          <div className="mt-4">
            <Link
              href={`/dashboard/seller/${component.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-block border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
            >
              <span aria-hidden>✎</span> {t("edit")}
            </Link>
          </div>
        )}
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
  );
}
