import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/request";
import { postReply, deleteReply, type PostReplyDb, type DeleteReplyDb } from "@/lib/replies";
import { narrowDb } from "@/lib/db-port";

export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const payload = await parseBody<{ body?: unknown }>(req);
  if (payload instanceof NextResponse) return payload;

  const result = await postReply(narrowDb<PostReplyDb>(supabase), {
    reviewId: params.id,
    sellerId: profile.id,
    body: payload.body,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ reply: result.reply });
});

export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await deleteReply(narrowDb<DeleteReplyDb>(supabase), { reviewId: params.id, sellerId: profile.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
});
