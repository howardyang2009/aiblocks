import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

// Resolve the current Clerk user to their AiBlocks profile row.
// Returns null if signed out or no profile exists yet.
export async function getCurrentProfile() {
  const { userId } = auth();
  if (!userId) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  return data ?? null;
}

// Require a signed-in user; throws if not. Use in API routes.
export function requireUserId(): string {
  const { userId } = auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
