import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import type { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Viewer =
  | { userId: string; profile: Tables<"profiles"> }
  | { userId: null; profile: null };

// The Server Component counterpart to withAuth: resolves who's looking at
// the page and bootstraps their profile row via ensureProfile — the same
// guarantee every API route already gets. Unlike withAuth this never
// rejects; signed-out visitors get a null viewer so the page still renders.
export async function getViewer(
  supabase: ReturnType<typeof createServiceClient>
): Promise<Viewer> {
  const { userId } = auth();
  if (!userId) return { userId: null, profile: null };
  const profile = await ensureProfile(userId, supabase);
  return { userId, profile };
}
