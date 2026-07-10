import type { Tables } from "@/types/database";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/commerce/components";
import type { Result } from "@/lib/result";
import type { DeleteChain } from "@/lib/db-port";

export type ToggleStarResult = Result<{ starred: boolean }>;

export type ToggleStarDb = PublishedComponentDb & {
  from(table: "stars"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): PromiseLike<{ data: Pick<Tables<"stars">, "user_id"> | null }>;
        };
      };
    };
    delete(): DeleteChain;
    insert(row: { user_id: string; component_id: string }): PromiseLike<{
      error: { message: string } | null;
    }>;
  };
};

// Toggle a star for the current user. The star_count trigger keeps
// components.star_count in sync automatically.
export async function toggleStar(
  supabase: ToggleStarDb,
  args: { componentId: string; userId: string }
): Promise<ToggleStarResult> {
  if (!(await getPublishedComponent(supabase, args.componentId))) {
    return { ok: false, status: 404, error: "Component not found." };
  }

  const { data: existing } = await supabase
    .from("stars")
    .select("user_id")
    .eq("user_id", args.userId)
    .eq("component_id", args.componentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("stars")
      .delete()
      .eq("user_id", args.userId)
      .eq("component_id", args.componentId);
    if (error) return { ok: false, status: 500, error: "Failed to remove star." };
    return { ok: true, starred: false };
  }

  const { error } = await supabase
    .from("stars")
    .insert({ user_id: args.userId, component_id: args.componentId });
  if (error) return { ok: false, status: 500, error: "Failed to add star." };
  return { ok: true, starred: true };
}
