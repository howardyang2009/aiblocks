import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { ReviewsSection } from "@/components/reviews-section";
import { CommentsSection } from "@/components/comments-section";
import { formatPrice } from "@/lib/utils";
import { getViewer } from "@/lib/viewer";
import { fetchComponentRows, buildComponentView } from "./view-model";

export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile: viewerProfile } = await getViewer();
  const supabase = createServiceClient();
  const rows = await fetchComponentRows(supabase, id, viewerProfile);
  if (!rows) notFound();
  const data = buildComponentView(rows, viewerProfile);

  const { component, seller, tags, starred, owned, viewer, isSeller, reviews, reviewCount, avgRating, commentTree } = data;

  return (
    <div className="mx-auto max-w-shell px-5 py-10 grid lg:grid-cols-[1fr_320px] gap-10">
      <article>
        <p className="eyebrow">Component</p>
        <h1 className="font-display font-bold text-3xl mt-2">{component.name}</h1>
        <p className="text-muted mt-2">{component.description}</p>

        {seller && (
          <p className="text-sm text-subtle mt-3">
            by{" "}
            <Link href={`/sellers/${seller.username}`} className="text-accent hover:underline">
              @{seller.username}
            </Link>
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
        {component.readme?.trim()
          ? <MarkdownRenderer source={component.readme} />
          : <p className="text-sm text-subtle">No README provided.</p>}

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
        <p className="font-mono text-2xl">{formatPrice(component.price_cents, component.currency)}</p>
        {owned && component.price_cents > 0 && (
          <p className="font-mono text-[11px] text-free mt-1">purchased</p>
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
              <span aria-hidden>✎</span> Edit component
            </Link>
          </div>
        )}
        <dl className="mt-6 space-y-2 font-mono text-xs text-subtle">
          <div className="flex justify-between"><dt>downloads</dt><dd>{component.download_count}</dd></div>
          <div className="flex justify-between"><dt>stars</dt><dd>{component.star_count}</dd></div>
          <div className="flex justify-between">
            <dt>rating</dt>
            <dd>
              {avgRating !== null ? (
                <a href="#reviews" className="hover:text-accent">
                  {avgRating.toFixed(1)} ({reviewCount})
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
