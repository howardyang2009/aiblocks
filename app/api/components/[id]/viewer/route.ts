import { NextResponse } from "next/server";
import { getViewer } from "@/lib/identity/viewer";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { getEntitlement, type EntitlementLookupDb } from "@/lib/commerce/entitlements";
import { toPublicProfile } from "@/lib/identity/public-profile";
import { SIGNED_OUT, type ComponentViewerState } from "@/lib/engagement/component-viewer";

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } };

// GET /api/components/[id]/viewer: the per-Viewer half of the cached
// Component page (lib/engagement/component-viewer.ts). Signed out is an
// answer, not an error, so this never 401s.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { profile }] = await Promise.all([params, getViewer()]);
  if (!profile) return NextResponse.json(SIGNED_OUT, PRIVATE);

  const supabase = createServiceClient();
  const [{ data: component }, { data: starRow }, owned, { data: review }, { data: comments }] = await Promise.all([
    supabase.from("components").select("seller_id").eq("id", id).maybeSingle(),
    supabase.from("stars").select("user_id").eq("user_id", profile.id).eq("component_id", id).maybeSingle(),
    getEntitlement(narrowDb<EntitlementLookupDb>(supabase), profile.id, id),
    supabase.from("reviews").select("id").eq("buyer_id", profile.id).eq("component_id", id).maybeSingle(),
    supabase.from("comments").select("id").eq("user_id", profile.id).eq("component_id", id),
  ]);

  const state: ComponentViewerState = {
    signedIn: true,
    viewer: toPublicProfile(profile),
    isSeller: component?.seller_id === profile.id,
    owned,
    starred: !!starRow,
    myReviewId: review?.id ?? null,
    myCommentIds: (comments ?? []).map((c) => c.id),
  };
  return NextResponse.json(state, PRIVATE);
}
