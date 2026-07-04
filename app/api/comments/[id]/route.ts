import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { deleteComment, type DeleteCommentDb } from "@/lib/comments";
import { narrowDb } from "@/lib/db-port";

// Delete your own comment. [id] is the COMMENT id.
export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await deleteComment(narrowDb<DeleteCommentDb>(supabase), { commentId: params.id, userId: profile.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
});
