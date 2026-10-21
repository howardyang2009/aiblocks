import type { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { getEntitlement, type EntitlementLookupDb } from "@/lib/commerce/entitlements";
import { getComponentTagNames, type ComponentTagsDb } from "@/lib/commerce/components";
import { narrowDb } from "@/lib/db-port";
import { toPublicProfile } from "@/lib/identity/public-profile";
import type { Viewer } from "@/lib/identity/viewer";
import { buildReviewList } from "@/lib/engagement/review-list";
import { buildCommentTree } from "@/lib/engagement/comment-thread";

// The only part of this page that touches Supabase. Everything it returns
// is a plain row (or already-resolved boolean) — no business logic lives
// here, so nothing below needs a fake query builder to test.
//
// The published-component gate (Q1) is the caller's: page.tsx already has
// the row from the same per-request lookup generateMetadata used, so it is
// not fetched a second time here. The Viewer arrives as a promise, not a
// value: resolving it costs a Clerk round trip (plus the profile bootstrap)
// that nothing in tier 2 needs, so it runs alongside tier 2 and is only
// awaited where a query first depends on who is looking.
export async function fetchComponentRows(
  supabase: ReturnType<typeof createServiceClient>,
  component: Tables<"components">,
  viewer: Promise<Viewer>
) {
  // Tier 2 — three queries independent of each other and of the Viewer.
  const [
    { data: seller },
    { data: reviewRows },
    { data: commentRows },
  ] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", component.seller_id).maybeSingle(),
    supabase.from("reviews").select("id, buyer_id, rating, body, created_at").eq("component_id", component.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("comments").select("id, user_id, parent_id, body, created_at").eq("component_id", component.id).order("created_at", { ascending: true }).limit(200),
  ]);

  // Query-planning inputs for tier 3 — not business logic, just IDs to fetch.
  const reviewerIds  = [...new Set((reviewRows ?? []).map(r => r.buyer_id))];
  const commenterIds = [...new Set((commentRows ?? []).map(r => r.user_id))];

  // First point where a query depends on the Viewer (entitlement, star).
  const { profile: viewerProfile } = await viewer;

  // Dispatched here (not awaited yet) so it still fires in parallel with the
  // tier-3 Promise.all below. Kept as its own statement rather than inside
  // that Promise.all tuple: this function chains many Supabase queries in
  // one scope, and mixing getEntitlement's narrow-port type check with five
  // other deeply-generic builder types in one tuple literal pushes
  // TypeScript's structural comparison past its recursion limit ("Type
  // instantiation is excessively deep").
  const ownedPromise: PromiseLike<boolean> = viewerProfile
    ? getEntitlement(narrowDb<EntitlementLookupDb>(supabase), viewerProfile.id, component.id)
    : Promise.resolve(false);

  // Dispatched here for the same reason as ownedPromise: it doesn't depend
  // on (or get depended on by) anything in tier 2/3, so it just runs
  // alongside them rather than occupying a slot in either tier.
  const tagsPromise: Promise<string[]> = getComponentTagNames(narrowDb<ComponentTagsDb>(supabase), component.id);

  // Tier 3 — four queries, each depends on one tier-2 result, none on each other.
  const [
    { data: starRow },
    { data: reviewers },
    { data: replyRows },
    { data: commenters },
  ] = await Promise.all([
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
  const tags = await tagsPromise;

  return { component, seller, tags, reviewRows, commentRows, starRow, owned, reviewers, replyRows, commenters };
}

export type ComponentRows = NonNullable<Awaited<ReturnType<typeof fetchComponentRows>>>;

// Everything the page needs to render, computed from already-fetched rows.
// No Supabase, no network — test this with plain object literals.
export function buildComponentView(rows: ComponentRows, viewerProfile: Tables<"profiles"> | null) {
  const { component, seller, tags, reviewRows, commentRows, starRow, owned, reviewers, replyRows, commenters } = rows;

  const viewerProfileId = viewerProfile?.id ?? null;
  const viewer = viewerProfile ? toPublicProfile(viewerProfile) : null;

  const starred  = !!starRow;
  const isSeller = viewerProfileId !== null && viewerProfileId === component.seller_id;

  const reviews = buildReviewList(reviewRows ?? [], {
    reviewers: reviewers ?? [],
    replies: replyRows ?? [],
    viewerId: viewerProfileId,
  });

  const reviewCount = reviews.length;
  const avgRating   = reviewCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : null;

  const commentTree = buildCommentTree(commentRows ?? [], {
    authors: commenters ?? [],
    sellerId: component.seller_id,
    viewerId: viewerProfileId,
  });

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
