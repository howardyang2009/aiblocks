import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { deleteComment, type DeleteCommentDb } from "@/lib/engagement/comments";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

// Delete your own comment. [id] is the COMMENT id.
export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await deleteComment(narrowDb<DeleteCommentDb>(supabase), { commentId: params.id, userId: profile.id });
  if (!result.ok) return toResponse(result);
  return NextResponse.json({ deleted: true });
});
