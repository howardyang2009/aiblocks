import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { postReply, deleteReply, type PostReplyDb, type DeleteReplyDb } from "@/lib/engagement/replies";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const payload = await parseBody<{ body?: unknown }>(req);
  if (payload instanceof NextResponse) return payload;

  const result = await postReply(narrowDb<PostReplyDb>(supabase), {
    reviewId: params.id,
    sellerId: profile.id,
    body: payload.body,
  });
  if (!result.ok) return toResponse(result);
  return NextResponse.json({ reply: result.reply });
});

export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await deleteReply(narrowDb<DeleteReplyDb>(supabase), { reviewId: params.id, sellerId: profile.id });
  if (!result.ok) return toResponse(result);
  return NextResponse.json({ deleted: true });
});
