import type { Tables } from "@/types/database";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/components";
import { validateBody } from "@/lib/validation";
import { getEntitlement, type DownloadLookupDb } from "@/lib/entitlements";
import type { Result } from "@/lib/result";
import type { ScopedDeleteDb } from "@/lib/db-port";

export type PostReviewResult = Result<{
  review: Pick<Tables<"reviews">, "id" | "rating" | "body" | "created_at" | "updated_at">;
}>;

export type PostReviewDb = PublishedComponentDb &
  DownloadLookupDb & {
    from(table: "reviews"): {
      upsert(
        row: { component_id: string; buyer_id: string; rating: number; body: string | null },
        opts: { onConflict: string }
      ): {
        select(columns: string): {
          single(): PromiseLike<{
            data: Pick<Tables<"reviews">, "id" | "rating" | "body" | "created_at" | "updated_at"> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

// Verified-buyer reviews (V2). "Verified" means: the user has a
// `downloads` row for this component — the same source of truth the
// download paywall uses. Sellers cannot review their own component. One
// review per buyer per component (DB unique) -> POST upserts.
export async function postReview(
  supabase: PostReviewDb,
  args: { componentId: string; buyerId: string; rating: unknown; body: unknown }
): Promise<PostReviewResult> {
  const rating = Number(args.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, status: 400, error: "Rating must be a whole number from 1 to 5." };
  }

  const validated = validateBody(args.body, { required: false, label: "Review text" });
  if (!validated.ok) return validated;

  const component = await getPublishedComponent(supabase, args.componentId);
  if (!component) return { ok: false, status: 404, error: "Component not found." };

  if (component.seller_id === args.buyerId) {
    return { ok: false, status: 403, error: "You can't review your own component." };
  }

  if (!(await getEntitlement(supabase, args.buyerId, args.componentId))) {
    return {
      ok: false,
      status: 403,
      error: "Only verified buyers can review. Download this component first.",
    };
  }

  // Create or update — the (component_id, buyer_id) unique constraint
  // makes upsert the natural "one review per buyer" implementation.
  const { data: review, error } = await supabase
    .from("reviews")
    .upsert(
      { component_id: args.componentId, buyer_id: args.buyerId, rating, body: validated.value || null },
      { onConflict: "component_id,buyer_id" }
    )
    .select("id, rating, body, created_at, updated_at")
    .single();

  if (error || !review) {
    return { ok: false, status: 500, error: "Could not save the review. Try again." };
  }
  return { ok: true, review };
}

export type DeleteReviewResult = Result;
export type DeleteReviewDb = ScopedDeleteDb<"reviews">;

// Scoped to the caller's own row — a user can only delete their review.
export async function deleteReview(
  supabase: DeleteReviewDb,
  args: { componentId: string; buyerId: string }
): Promise<DeleteReviewResult> {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("component_id", args.componentId)
    .eq("buyer_id", args.buyerId);
  if (error) return { ok: false, status: 500, error: "Could not delete the review. Try again." };
  return { ok: true };
}
