import type { Tables } from "@/types/database";
import { validateBody } from "@/lib/validation";
import type { Result } from "@/lib/result";
import type { ScopedDeleteDb } from "@/lib/db-port";

export type PostReplyResult = Result<{
  reply: Pick<Tables<"review_replies">, "id" | "body" | "created_at" | "updated_at">;
}>;

export type PostReplyDb = {
  from(table: "reviews"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Pick<Tables<"reviews">, "id" | "component_id"> | null }>;
      };
    };
  };
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Pick<Tables<"components">, "id" | "seller_id"> | null }>;
      };
    };
  };
  from(table: "review_replies"): {
    upsert(
      row: { review_id: string; component_id: string; seller_id: string; body: string },
      opts: { onConflict: string }
    ): {
      select(columns: string): {
        single(): PromiseLike<{
          data: Pick<Tables<"review_replies">, "id" | "body" | "created_at" | "updated_at"> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

// Seller replies to verified-buyer reviews (V2). [reviewId] is the REVIEW
// id, not the component id. Only the seller of the reviewed component may
// reply. One reply per review (DB unique on review_id) -> POST upserts.
export async function postReply(
  supabase: PostReplyDb,
  args: { reviewId: string; sellerId: string; body: unknown }
): Promise<PostReplyResult> {
  const validated = validateBody(args.body, { required: "replyRequired", tooLong: "replyTooLong" });
  if (!validated.ok) return validated;

  // Load the review to learn which component it belongs to.
  const { data: review } = await supabase
    .from("reviews")
    .select("id, component_id")
    .eq("id", args.reviewId)
    .maybeSingle();
  if (!review) return { ok: false, status: 404, error: "reviewNotFound" };

  const { data: component } = await supabase
    .from("components")
    .select("id, seller_id")
    .eq("id", review.component_id)
    .maybeSingle();
  if (!component || component.seller_id !== args.sellerId) {
    return {
      ok: false,
      status: 403,
      error: "sellerOnlyReply",
    };
  }

  // Create or update — unique(review_id) makes upsert "one reply per review".
  const { data: reply, error } = await supabase
    .from("review_replies")
    .upsert(
      { review_id: args.reviewId, component_id: component.id, seller_id: args.sellerId, body: validated.value },
      { onConflict: "review_id" }
    )
    .select("id, body, created_at, updated_at")
    .single();

  if (error || !reply) {
    return { ok: false, status: 500, error: "replySaveFailed" };
  }
  return { ok: true, reply };
}

export type DeleteReplyResult = Result;
export type DeleteReplyDb = ScopedDeleteDb<"review_replies">;

// Scoped to the caller's own reply — matches the RLS delete policy.
export async function deleteReply(
  supabase: DeleteReplyDb,
  args: { reviewId: string; sellerId: string }
): Promise<DeleteReplyResult> {
  const { error } = await supabase
    .from("review_replies")
    .delete()
    .eq("review_id", args.reviewId)
    .eq("seller_id", args.sellerId);
  if (error) return { ok: false, status: 500, error: "replyDeleteFailed" };
  return { ok: true };
}
