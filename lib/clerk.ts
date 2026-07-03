import { currentUser } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

// Return the current user's profile, creating it on first use.
// A user "becomes" a seller the first time they publish, so we lazily
// bootstrap a profile row here rather than needing a separate sign-up step.
export async function ensureProfile(
  userId: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  // Derive a starting username from Clerk identity.
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const base =
    slugify(user?.username || email?.split("@")[0] || "user").replace(/-/g, "") ||
    "user";

  // Ensure the username is unique (slug is unique in the schema).
  let username = base;
  for (let i = 0; i < 6; i++) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!taken) break;
    username = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || username;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: userId,
      username,
      display_name: displayName,
      avatar_url: user?.imageUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Likely a race (profile created concurrently) — fetch and return it.
    const { data: again } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (again) return again;
    throw error;
  }

  return created;
}
