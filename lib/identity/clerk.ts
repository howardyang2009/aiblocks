import { slugify } from "@/lib/utils";
import type { Tables } from "@/types/database";

// The narrow slice of a Clerk user this module actually reads — a test fake
// is a plain object, not a mock of the Clerk module.
export type ClerkUserLike = {
  username: string | null;
  emailAddresses: { emailAddress: string }[];
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
} | null;

export type GetClerkUser = () => Promise<ClerkUserLike>;

export type EnsureProfileDb = {
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Tables<"profiles"> | null }>;
      };
    };
    insert(row: {
      clerk_user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }): {
      select(columns: string): {
        single(): PromiseLike<{ data: Tables<"profiles"> | null; error: { message: string } | null }>;
      };
    };
  };
};

// Return the current user's profile, creating it on first use. A user
// "becomes" a seller the first time they publish, so we lazily bootstrap a
// profile row here rather than needing a separate sign-up step.
//
// `getClerkUser` is only called when no existing profile is found — real
// callers pass Clerk's `currentUser`, so an already-bootstrapped user never
// pays for a Clerk API round trip; a test fake just returns a plain object.
export async function ensureProfile(
  userId: string,
  supabase: EnsureProfileDb,
  getClerkUser: GetClerkUser
): Promise<Tables<"profiles">> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  // Derive a starting username from Clerk identity.
  const user = await getClerkUser();
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

  if (error || !created) {
    // Likely a race (profile created concurrently) — fetch and return it.
    const { data: again } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (again) return again;
    throw error ?? new Error("Could not create profile.");
  }

  return created;
}
