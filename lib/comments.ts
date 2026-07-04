import type { Tables } from "@/types/database";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/components";
import { validateBody } from "@/lib/validation";
import type { Result } from "@/lib/result";
import type { ScopedDeleteDb } from "@/lib/db-port";

export type PostCommentResult = Result<{
  comment: Pick<Tables<"comments">, "id" | "parent_id" | "body" | "created_at">;
}>;

export type PostCommentDb = PublishedComponentDb & {
  from(table: "comments"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{
          data: Pick<Tables<"comments">, "id" | "component_id" | "parent_id"> | null;
        }>;
      };
    };
    insert(row: {
      component_id: string;
      user_id: string;
      parent_id: string | null;
      body: string;
    }): {
      select(columns: string): {
        single(): PromiseLike<{
          data: Pick<Tables<"comments">, "id" | "parent_id" | "body" | "created_at"> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

// Open comments (V2): any signed-in user may post a top-level comment or
// reply to one — the seller's messages are badged in the UI, not
// privileged in the data model. One level of threading only: a reply's
// parent must be a top-level comment on the SAME component.
export async function postComment(
  supabase: PostCommentDb,
  args: { componentId: string; userId: string; body: unknown; parentId: unknown }
): Promise<PostCommentResult> {
  const validated = validateBody(args.body, { required: true, label: "Comment text" });
  if (!validated.ok) return validated;

  if (!(await getPublishedComponent(supabase, args.componentId))) {
    return { ok: false, status: 404, error: "Component not found." };
  }

  const parentId = typeof args.parentId === "string" && args.parentId ? args.parentId : null;

  if (parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, component_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.component_id !== args.componentId) {
      return { ok: false, status: 404, error: "Comment to reply to was not found." };
    }
    if (parent.parent_id) {
      // One level of threading only — replies to replies are not allowed.
      return { ok: false, status: 400, error: "Replies can only be added to top-level comments." };
    }
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      component_id: args.componentId,
      user_id: args.userId,
      parent_id: parentId,
      body: validated.value,
    })
    .select("id, parent_id, body, created_at")
    .single();

  if (error || !comment) {
    return { ok: false, status: 500, error: "Could not post the comment. Try again." };
  }
  return { ok: true, comment };
}

export type DeleteCommentResult = Result;
export type DeleteCommentDb = ScopedDeleteDb<"comments">;

// Delete your own comment. `comments.parent_id` references comments(id)
// ON DELETE CASCADE, so deleting a top-level comment also removes its
// replies — the UI warns about this before sending the request.
export async function deleteComment(
  supabase: DeleteCommentDb,
  args: { commentId: string; userId: string }
): Promise<DeleteCommentResult> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", args.commentId)
    .eq("user_id", args.userId);
  if (error) return { ok: false, status: 500, error: "Could not delete the comment. Try again." };
  return { ok: true };
}
