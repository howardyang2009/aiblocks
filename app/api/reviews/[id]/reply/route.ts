import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { MAX_BODY_LENGTH } from "@/lib/constants";
import { parseBody } from "@/lib/request";

// Seller replies to verified-buyer reviews (V2).
//
// [id] here is the REVIEW id, not the component id.
//
// Rules enforced server-side (RLS in 0004 mirrors them):
//   * must be signed in
//   * the review must exist
//   * the caller must be the seller of the reviewed component
//   * body required, 1..2000 chars
//   * one reply per review (DB unique on review_id) -> POST upserts


export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const payload = await parseBody<{ body?: unknown }>(req);
  if (payload instanceof NextResponse) return payload;

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
  }
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Reply must be ${MAX_BODY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  // Load the review to learn which component it belongs to.
  const { data: review } = await supabase
    .from("reviews")
    .select("id, component_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  // Only the seller of the reviewed component may reply.
  const { data: component } = await supabase
    .from("components")
    .select("id, seller_id")
    .eq("id", review.component_id)
    .maybeSingle();
  if (!component || component.seller_id !== profile.id) {
    return NextResponse.json(
      { error: "Only the seller of this component can reply to its reviews." },
      { status: 403 }
    );
  }

  // Create or update — unique(review_id) makes upsert "one reply per review".
  const { data: reply, error } = await supabase
    .from("review_replies")
    .upsert(
      {
        review_id: params.id,
        component_id: component.id,
        seller_id: profile.id,
        body,
      },
      { onConflict: "review_id" }
    )
    .select("id, body, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save the reply. Try again." }, { status: 500 });
  }

  return NextResponse.json({ reply });
});

export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  // Scoped to the caller's own reply — matches the RLS delete policy.
  const { error } = await supabase
    .from("review_replies")
    .delete()
    .eq("review_id", params.id)
    .eq("seller_id", profile.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete the reply. Try again." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
});
