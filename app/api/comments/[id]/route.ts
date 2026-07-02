import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// Delete your own comment. [id] is the COMMENT id.
//
// Note: comments.parent_id references comments(id) ON DELETE CASCADE,
// so deleting a top-level comment also removes its replies — the UI
// warns about this before sending the request.
export const DELETE = withAuth(async (_req, { params, profile, supabase }) => {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", params.id)
    .eq("user_id", profile.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete the comment. Try again." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
});
