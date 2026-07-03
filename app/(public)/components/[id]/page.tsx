import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { ReviewsSection, type Review } from "@/components/reviews-section";
import { CommentsSection, type CommentNode } from "@/components/comments-section";
import { formatPrice } from "@/lib/utils";
import { getEntitlement } from "@/lib/entitlements";
import { getViewer } from "@/lib/viewer";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

async function loadComponentPageData(
  id: string,
  viewerProfile: Tables<"profiles"> | null,
  supabase: ReturnType<typeof createServiceClient>
) {
  // Q1 — gate: everything depends on the component existing.
  const { data: component } = await supabase
    .from("components")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!component) return null;

  // Tier 2 — four queries independent of each other, all unblocked after Q1.
  const [
    { data: seller },
    { data: ctRows },
    { data: reviewRows },
    { data: commentRows },
  ] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", component.seller_id).maybeSingle(),
    supabase.from("component_tags").select("tag_id").eq("component_id", component.id),
    supabase.from("reviews").select("id, buyer_id, rating, body, created_at").eq("component_id", component.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("comments").select("id, user_id, parent_id, body, created_at").eq("component_id", component.id).order("created_at", { ascending: true }).limit(200),
  ]);

  // Derived inputs for tier 3.
  const tagIds       = (ctRows ?? []).map(r => r.tag_id);
  const reviewerIds  = [...new Set((reviewRows ?? []).map(r => r.buyer_id))];
  const commenterIds = [...new Set((commentRows ?? []).map(r => r.user_id))];

  const viewerProfileId = viewerProfile?.id ?? null;
  const viewer = viewerProfile
    ? {
        username: viewerProfile.username,
        display_name: viewerProfile.display_name ?? null,
        avatar_url: viewerProfile.avatar_url ?? null,
      }
    : null;

  // Tier 3 — six queries, each depends on one tier-2 result, none on each other.
  const [
    { data: tagRows },
    { data: starRow },
    owned,
    { data: reviewers },
    { data: replyRows },
    { data: commenters },
  ] = await Promise.all([
    tagIds.length
      ? supabase.from("tags").select("name").in("id", tagIds)
      : Promise.resolve({ data: [] as { name: string }[] }),
    viewerProfile
      ? supabase.from("stars").select("user_id").eq("user_id", viewerProfile.id).eq("component_id", component.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewerProfile
      ? getEntitlement(supabase, viewerProfile.id, component.id)
      : Promise.resolve(false),
    reviewerIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", reviewerIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string | null; avatar_url: string | null }[] }),
    (reviewRows ?? []).length
      ? supabase.from("review_replies").select("review_id, body, created_at").eq("component_id", component.id)
      : Promise.resolve({ data: [] as { review_id: string; body: string; created_at: string }[] }),
    commenterIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", commenterIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string | null; avatar_url: string | null }[] }),
  ]);

  const tags    = (tagRows ?? []).map(r => r.name);
  const starred = !!starRow;
  const isSeller = viewerProfileId !== null && viewerProfileId === component.seller_id;

  const reviewerById   = new Map((reviewers ?? []).map(p => [p.id, p]));
  const replyByReviewId = new Map((replyRows ?? []).map(r => [r.review_id, r]));

  const reviews: Review[] = (reviewRows ?? []).map(r => {
    const p     = reviewerById.get(r.buyer_id);
    const reply = replyByReviewId.get(r.id);
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      reviewer: {
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      },
      mine: viewerProfileId !== null && r.buyer_id === viewerProfileId,
      reply: reply ? { body: reply.body, created_at: reply.created_at } : null,
    };
  });

  const reviewCount = reviews.length;
  const avgRating   = reviewCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : null;

  const commenterById = new Map((commenters ?? []).map(p => [p.id, p]));

  const toNode = (r: NonNullable<typeof commentRows>[number]): CommentNode => {
    const p = commenterById.get(r.user_id);
    return {
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author: {
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      },
      isSeller: r.user_id === component.seller_id,
      mine: viewerProfileId !== null && r.user_id === viewerProfileId,
      replies: [],
    };
  };

  const nodeById = new Map<string, CommentNode>();
  const commentTree: CommentNode[] = [];
  for (const r of commentRows ?? []) {
    const node = toNode(r);
    nodeById.set(r.id, node);
    if (!r.parent_id) commentTree.push(node);
  }
  for (const r of commentRows ?? []) {
    if (r.parent_id) nodeById.get(r.parent_id)?.replies.push(nodeById.get(r.id)!);
  }

  return {
    component,
    seller,
    tags,
    starred,
    owned,
    viewer,
    isSeller,
    reviews,
    reviewCount,
    avgRating,
    commentTree,
  };
}

export default async function ComponentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { profile: viewerProfile } = await getViewer(supabase);
  const data = await loadComponentPageData(params.id, viewerProfile, supabase);
  if (!data) notFound();

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
