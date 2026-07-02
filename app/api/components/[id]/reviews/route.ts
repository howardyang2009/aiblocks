import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";

// Verified-buyer reviews (V2).
//
// "Verified" means: the user has a `downloads` row for this component.
// That row is only ever created after a free download or a succeeded
// paid purchase (webhook-confirmed), so it doubles as proof of
// entitlement — the same source of truth the download paywall uses.
//
// Rules enforced here (server-side, service role — RLS mirrors them):
//   * must be signed in
//   * component must exist and be published
//   * sellers cannot review their own component
//   * must own the component (downloads row exists)
//   * rating is an integer 1..5, body optional, max 2000 chars
//   * one review per buyer per component (DB unique) -> POST upserts

const MAX_BODY_LENGTH = 2000;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to review." }, { status: 401 });

  let payload: { rating?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Review text must be ${MAX_BODY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const profile = await ensureProfile();
  const supabase = createServiceClient();

  // Component must exist and be published.
  const { data: component } = await supabase
    .from("components")
    .select("id, seller_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!component || component.status !== "published") {
    return NextResponse.json({ error: "Component not found." }, { status: 404 });
  }

  // No self-reviews.
  if (component.seller_id === profile.id) {
    return NextResponse.json({ error: "You can't review your own component." }, { status: 403 });
  }

  // Verified buyer check: entitlement row must exist.
  const { data: entitlement } = await supabase
    .from("downloads")
    .select("id")
    .eq("user_id", profile.id)
    .eq("component_id", params.id)
    .maybeSingle();
  if (!entitlement) {
    return NextResponse.json(
      { error: "Only verified buyers can review. Download this component first." },
      { status: 403 }
    );
  }

  // Create or update — the (component_id, buyer_id) unique constraint
  // makes upsert the natural "one review per buyer" implementation.
  const { data: review, error } = await supabase
    .from("reviews")
    .upsert(
      {
        component_id: params.id,
        buyer_id: profile.id,
        rating,
        body: body || null,
      },
      { onConflict: "component_id,buyer_id" }
    )
    .select("id, rating, body, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save the review. Try again." }, { status: 500 });
  }

  return NextResponse.json({ review });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await ensureProfile();
  const supabase = createServiceClient();

  // Scoped to the caller's own row — a user can only delete their review.
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("component_id", params.id)
    .eq("buyer_id", profile.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete the review. Try again." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
