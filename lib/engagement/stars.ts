import { getPublishedComponent, type PublishedComponentDb } from "@/lib/commerce/components";
import type { Result } from "@/lib/result";
import type { ApiError } from "@/lib/api-errors";
import type { DeleteChain } from "@/lib/db-port";

export type SetStarResult = Result<{ starred: boolean; count: number }>;

export type SetStarDb = PublishedComponentDb & {
  from(table: "stars"): {
    delete(): DeleteChain;
    upsert(
      row: { user_id: string; component_id: string },
      opts: { onConflict: string; ignoreDuplicates: boolean }
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

// Sets the viewer's Star to the state they asked for, not a toggle: a
// repeated request (double click, a second tab, a stale page) lands on the
// same state instead of flipping it back. Answers with the server's own
// starred state and star_count (kept by the star_count trigger), so the
// button shows the truth rather than its own arithmetic.
export async function setStar(
  supabase: SetStarDb,
  args: { componentId: string; userId: string; starred: boolean }
): Promise<SetStarResult> {
  if (!(await getPublishedComponent(supabase, args.componentId))) {
    return { ok: false, status: 404, error: "componentNotFound" satisfies ApiError };
  }

  const { error } = args.starred
    ? await supabase
        .from("stars")
        .upsert(
          { user_id: args.userId, component_id: args.componentId },
          { onConflict: "user_id,component_id", ignoreDuplicates: true }
        )
    : await supabase.from("stars").delete().eq("user_id", args.userId).eq("component_id", args.componentId);
  if (error) return { ok: false, status: 500, error: "starSaveFailed" satisfies ApiError };

  const after = await getPublishedComponent(supabase, args.componentId);
  return { ok: true, starred: args.starred, count: after?.star_count ?? 0 };
}
