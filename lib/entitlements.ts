import type { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// The `downloads` table is the single source of truth for "does this user
// own this component" — a row exists after a free download or a confirmed
// paid purchase (see app/api/webhooks/stripe/route.ts), and doubles as proof
// of entitlement for the download paywall and verified-buyer reviews alike.

// Does this user own this component?
export async function getEntitlement(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  componentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("downloads")
    .select("id")
    .eq("user_id", userId)
    .eq("component_id", componentId)
    .maybeSingle();
  return !!data;
}

// Every component a user has acquired, newest first — the buyer's library.
export async function listEntitlements(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<Pick<Tables<"downloads">, "component_id" | "acquired_at">[]> {
  const { data } = await supabase
    .from("downloads")
    .select("component_id, acquired_at")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });
  return data ?? [];
}
