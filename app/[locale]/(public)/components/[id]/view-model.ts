import type { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { getEntitlement, type EntitlementLookupDb } from "@/lib/commerce/entitlements";
import { getComponentTagNames, type ComponentTagsDb } from "@/lib/commerce/components";
import { narrowDb } from "@/lib/db-port";
import { toPublicProfile } from "@/lib/identity/public-profile";
import type { Viewer } from "@/lib/identity/viewer";
import { buildReviewList, ratingSummary, unloadedRatings } from "@/lib/engagement/review-list";
import { buildCommentTree } from "@/lib/engagement/comment-thread";

// The only part of this page that touches Supabase. Everything it returns
// is a plain row (or already-resolved boolean) — no business logic lives
// here, so nothing below needs a fake query builder to test.
//
// Every query is keyed by the Component id from the URL, so all of them
// start at once, alongside the page's own published-component lookup
// (page.tsx) instead of after it: one round trip of Supabase queries, not
// three. Reviewer, commenter and seller profiles come embedded through
// their foreign keys rather than as follow-up `in (...)` lookups. The
// published gate stays the caller's: page.tsx calls notFound() before
// anything here is shown. The Viewer arrives as a promise: resolving it
// costs a Clerk round trip (plus the profile bootstrap), so only the Star
// and entitlement lookups, which need the Viewer's id, wait for it.
export async function fetchComponentRows(
  supabase: ReturnType<typeof createServiceClient>,
  componentId: string,
  viewer: Promise<Viewer>
) {
  const viewerRowsPromise = viewer.then(async ({ profile }) => {
    if (!profile) return { starRow: null, owned: false };
    const [{ data: starRow }, owned] = await Promise.all([
      supabase.from("stars").select("user_id").eq("user_id", profile.id).eq("component_id", componentId).maybeSingle(),
      getEntitlement(narrowDb<EntitlementLookupDb>(supabase), profile.id, componentId),
    ]);
    return { starRow, owned };
  });

  const [
    { data: sellerRow },
    { data: reviewRowsWithReviewer },
    { data: commentRowsWithAuthor },
    { data: ratingRows },
    { data: replyRows },
    tags,
    { starRow, owned },
  ] = await Promise.all([
    supabase.from("components").select("seller:profiles!components_seller_id_fkey(username, display_name)").eq("id", componentId).maybeSingle(),
    supabase.from("reviews").select("id, buyer_id, rating, body, created_at, reviewer:profiles!reviews_buyer_id_fkey(id, username, display_name, avatar_url)").eq("component_id", componentId).order("created_at", { ascending: false }).limit(100),
    supabase.from("comments").select("id, user_id, parent_id, body, created_at, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)").eq("component_id", componentId).order("created_at", { ascending: true }).limit(200),
    supabase.from("reviews").select("rating").eq("component_id", componentId),
    supabase.from("review_replies").select("review_id, body, created_at").eq("component_id", componentId),
    getComponentTagNames(narrowDb<ComponentTagsDb>(supabase), componentId),
    viewerRowsPromise,
  ]);

  const reviewRows = (reviewRowsWithReviewer ?? []).map(({ reviewer: _, ...review }) => review);
  const commentRows = (commentRowsWithAuthor ?? []).map(({ author: _, ...comment }) => comment);
  const reviewers = (reviewRowsWithReviewer ?? []).flatMap((r) => (r.reviewer ? [r.reviewer] : []));
  const commenters = (commentRowsWithAuthor ?? []).flatMap((c) => (c.author ? [c.author] : []));
  const ratings = (ratingRows ?? []).map((r) => r.rating);

  return { seller: sellerRow?.seller ?? null, tags, reviewRows, ratings, commentRows, starRow, owned, reviewers, replyRows, commenters };
}

export type ComponentRows = Awaited<ReturnType<typeof fetchComponentRows>> & { component: Tables<"components"> };

// Everything the page needs to render, computed from already-fetched rows.
// No Supabase, no network — test this with plain object literals.
export function buildComponentView(rows: ComponentRows, viewerProfile: Tables<"profiles"> | null) {
  const { component, seller, tags, reviewRows, ratings, commentRows, starRow, owned, reviewers, replyRows, commenters } = rows;

  const viewerProfileId = viewerProfile?.id ?? null;
  const viewer = viewerProfile ? toPublicProfile(viewerProfile) : null;

  const starred  = !!starRow;
  const isSeller = viewerProfileId !== null && viewerProfileId === component.seller_id;

  const reviews = buildReviewList(reviewRows ?? [], {
    reviewers: reviewers ?? [],
    replies: replyRows ?? [],
    viewerId: viewerProfileId,
  });

  const unloaded = unloadedRatings(ratings, reviews);
  const { count: reviewCount, average: avgRating } = ratingSummary(unloaded, reviews);

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
    unloadedRatings: unloaded,
    commentTree,
  };
}
