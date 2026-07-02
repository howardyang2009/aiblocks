import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { MAX_BODY_LENGTH } from "@/lib/constants";

// Open comments (V2). Unlike reviews, comments are NOT gated:
// "anyone can ask questions or comment" (vision doc). Any signed-in
// user may post a top-level comment or reply to one — the seller's
// messages are badged in the UI, not privileged in the data model.
//
// Rules enforced here (RLS in 0002 mirrors the identity checks):
//   * must be signed in
//   * component must exist and be published
//   * body required, 1..2000 chars
//   * one level of threading only: a reply's parent must be a
//     top-level comment on the SAME component


export const POST = withAuth(async (req, { params, profile, supabase }) => {
  let payload: { body?: unknown; parentId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be ${MAX_BODY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const parentId = typeof payload.parentId === "string" && payload.parentId ? payload.parentId : null;

  // Component must exist and be published.
  const { data: component } = await supabase
    .from("components")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!component || component.status !== "published") {
    return NextResponse.json({ error: "Component not found." }, { status: 404 });
  }

  // Replying? The parent must be a top-level comment on this component.
  if (parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, component_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.component_id !== params.id) {
      return NextResponse.json({ error: "Comment to reply to was not found." }, { status: 404 });
    }
    if (parent.parent_id) {
      // One level of threading only — replies to replies are not allowed.
      return NextResponse.json(
        { error: "Replies can only be added to top-level comments." },
        { status: 400 }
      );
    }
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      component_id: params.id,
      user_id: profile.id,
      parent_id: parentId,
      body,
    })
    .select("id, parent_id, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not post the comment. Try again." }, { status: 500 });
  }

  return NextResponse.json({ comment });
});
