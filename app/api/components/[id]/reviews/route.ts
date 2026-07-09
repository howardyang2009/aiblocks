import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { postReview, deleteReview, type PostReviewDb, type DeleteReviewDb } from "@/lib/engagement/reviews";
import { narrowDb } from "@/lib/db-port";

export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const payload = await parseBody<{ rating?: unknown; body?: unknown }>(req);
  if (payload instanceof NextResponse) return payload;

  const result = await postReview(narrowDb<PostReviewDb>(supabase), {
    componentId: params.id,
    buyerId: profile.id,
    rating: payload.rating,
    body: payload.body,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ review: result.review });
});

export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await deleteReview(narrowDb<DeleteReviewDb>(supabase), { componentId: params.id, buyerId: profile.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
});
