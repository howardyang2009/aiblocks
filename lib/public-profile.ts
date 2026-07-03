// The subset of a Profile shown wherever someone's public identity is
// rendered — an avatar, a reviewer byline, a comment author.
export type PublicProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Rows joined in by id (e.g. a reviewer or comment author looked up from a
// Map) can come back missing if the join found nothing — `fallbackUsername`
// covers that. The viewer's own profile is always present, so it never
// needs the fallback.
export function toPublicProfile(
  row: { username: string; display_name: string | null; avatar_url: string | null } | null | undefined,
  fallbackUsername = "unknown"
): PublicProfile {
  return {
    username: row?.username ?? fallbackUsername,
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
  };
}
