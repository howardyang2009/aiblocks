import type { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { getEntitlement, type DownloadLookupDb } from "@/lib/entitlements";
import { toPublicProfile } from "@/lib/public-profile";
import type { Review } from "@/components/reviews-section";
import type { CommentNode } from "@/components/comments-section";

// The only part of this page that touches Supabase. Everything it returns
// is a plain row (or already-resolved boolean) — no business logic lives
// here, so nothing below needs a fake query builder to test.
export async function fetchComponentRows(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  viewerProfile: Tables<"profiles"> | null
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

  // Query-planning inputs for tier 3 — not business logic, just IDs to fetch.
  const tagIds       = (ctRows ?? []).map(r => r.tag_id);
  const reviewerIds  = [...new Set((reviewRows ?? []).map(r => r.buyer_id))];
  const commenterIds = [...new Set((commentRows ?? []).map(r => r.user_id))];

  // Dispatched here (not awaited yet) so it still fires in parallel with the
  // tier-3 Promise.all below.
  //
  // This function chains many Supabase queries in one scope; checking
  // getEntitlement's narrow DownloadLookupDb port against the full
  // SupabaseClient<Database> type here pushes TypeScript past its
  // structural-comparison recursion limit ("Type instantiation is
  // excessively deep") — it type-checks fine at every other call site with
  // fewer chained queries in scope. The cast is safe: the same assignment
  // succeeds unassisted in lib/purchases.ts and every API route that calls
  // getEntitlement with this exact client.
  const ownedPromise: PromiseLike<boolean> = viewerProfile
    ? getEntitlement(supabase as unknown as DownloadLookupDb, viewerProfile.id, component.id)
    : Promise.resolve(false);

  // Tier 3 — five queries, each depends on one tier-2 result, none on each other.
  const [
    { data: tagRows },
    { data: starRow },
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
  const owned = await ownedPromise;

  return { component, seller, tagRows, reviewRows, commentRows, starRow, owned, reviewers, replyRows, commenters };
}

export type ComponentRows = NonNullable<Awaited<ReturnType<typeof fetchComponentRows>>>;

// Everything the page needs to render, computed from already-fetched rows.
// No Supabase, no network — test this with plain object literals.
export function buildComponentView(rows: ComponentRows, viewerProfile: Tables<"profiles"> | null) {
  const { component, seller, tagRows, reviewRows, commentRows, starRow, owned, reviewers, replyRows, commenters } = rows;

  const viewerProfileId = viewerProfile?.id ?? null;
  const viewer = viewerProfile ? toPublicProfile(viewerProfile) : null;

  const tags     = (tagRows ?? []).map(r => r.name);
  const starred  = !!starRow;
  const isSeller = viewerProfileId !== null && viewerProfileId === component.seller_id;

  const reviewerById    = new Map((reviewers ?? []).map(p => [p.id, p]));
  const replyByReviewId = new Map((replyRows ?? []).map(r => [r.review_id, r]));

  const reviews: Review[] = (reviewRows ?? []).map(r => {
    const p     = reviewerById.get(r.buyer_id);
    const reply = replyByReviewId.get(r.id);
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      reviewer: toPublicProfile(p),
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
      author: toPublicProfile(p),
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
