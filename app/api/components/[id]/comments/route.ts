import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { postComment, type PostCommentDb } from "@/lib/engagement/comments";
import { narrowDb } from "@/lib/db-port";

export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const payload = await parseBody<{ body?: unknown; parentId?: unknown }>(req);
  if (payload instanceof NextResponse) return payload;

  const result = await postComment(narrowDb<PostCommentDb>(supabase), {
    componentId: params.id,
    userId: profile.id,
    body: payload.body,
    parentId: payload.parentId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ comment: result.comment });
});
