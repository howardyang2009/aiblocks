import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";

// Delete your own comment. [id] is the COMMENT id.
//
// Note: comments.parent_id references comments(id) ON DELETE CASCADE,
// so deleting a top-level comment also removes its replies — the UI
// warns about this before sending the request.

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const profile = await ensureProfile();
  const supabase = createServiceClient();

  // Scoped to the caller's own row — matches the RLS delete policy.
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", params.id)
    .eq("user_id", profile.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete the comment. Try again." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
