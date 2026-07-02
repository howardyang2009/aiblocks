import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { ReviewsSection, type Review } from "@/components/reviews-section";
import { CommentsSection, type CommentNode } from "@/components/comments-section";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: component } = await supabase
    .from("components")
    .select("*")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!component) notFound();

  // Seller for attribution.
  const { data: seller } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", component.seller_id)
    .maybeSingle();

  // Tags (two-step to avoid join-shape ambiguity).
  const { data: ctRows } = await supabase
    .from("component_tags").select("tag_id").eq("component_id", component.id);
  const tagIds = (ctRows ?? []).map(r => r.tag_id);
  let tags: string[] = [];
  if (tagIds.length) {
    const { data: tg } = await supabase.from("tags").select("name").in("id", tagIds);
    tags = (tg ?? []).map(r => r.name);
  }

  // Current user: starred? owns it?
  const { userId } = auth();
  let starred = false;
  let owned = false;
  let viewerProfileId: string | null = null;
  let viewer: { username: string; display_name: string | null; avatar_url: string | null } | null =
    null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (profile) {
      const pid = profile.id;
      viewerProfileId = pid;
      viewer = {
        username: profile.username,
        display_name: profile.display_name ?? null,
        avatar_url: profile.avatar_url ?? null,
      };
      const { data: s } = await supabase
        .from("stars").select("user_id").eq("user_id", pid).eq("component_id", component.id).maybeSingle();
      starred = !!s;
      const { data: d } = await supabase
        .from("downloads").select("id").eq("user_id", pid).eq("component_id", component.id).maybeSingle();
      owned = !!d;
    }
  }
  const isSeller = viewerProfileId !== null && viewerProfileId === component.seller_id;

  // Reviews (V2) — two-step fetch, matching the tags pattern above.
  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, buyer_id, rating, body, created_at")
    .eq("component_id", component.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const reviewerIds = [...new Set((reviewRows ?? []).map(r => r.buyer_id))];
  let reviewerById = new Map<string, any>();
  if (reviewerIds.length) {
    const { data: reviewers } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", reviewerIds);
    reviewerById = new Map((reviewers ?? []).map(p => [p.id, p]));
  }

  // Seller replies (V2) — one query for the whole component, keyed by review.
  let replyByReviewId = new Map<string, any>();
  if ((reviewRows ?? []).length) {
    const { data: replyRows } = await supabase
      .from("review_replies")
      .select("review_id, body, created_at")
      .eq("component_id", component.id);
    replyByReviewId = new Map((replyRows ?? []).map(r => [r.review_id, r]));
  }

  const reviews: Review[] = (reviewRows ?? []).map(r => {
    const p = reviewerById.get(r.buyer_id);
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
  const avgRating = reviewCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : null;

  // Comments (V2) — open discussion. Same two-step fetch pattern,
  // then assemble parent -> replies on the server so the client just
  // renders a tree. Oldest first: threads read top-down like a
  // conversation (unlike reviews, which lead with the newest).
  const { data: commentRows } = await supabase
    .from("comments")
    .select("id, user_id, parent_id, body, created_at")
    .eq("component_id", component.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const commenterIds = [...new Set((commentRows ?? []).map(r => r.user_id))];
  let commenterById = new Map<string, any>();
  if (commenterIds.length) {
    const { data: commenters } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", commenterIds);
    commenterById = new Map((commenters ?? []).map(p => [p.id, p]));
  }

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
    const parentId = r.parent_id;
    if (parentId) nodeById.get(parentId)?.replies.push(nodeById.get(r.id)!);
  }

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
          signedIn={!!userId}
          isSeller={isSeller}
          sellerUsername={seller?.username ?? null}
        />

        <hr className="my-8" />
        <CommentsSection
          componentId={component.id}
          initialComments={commentTree}
          signedIn={!!userId}
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
            signedIn={!!userId}
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
