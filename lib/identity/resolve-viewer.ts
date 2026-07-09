import type { Tables } from "@/types/database";

export type Viewer =
  | { userId: string; profile: Tables<"profiles"> }
  | { userId: null; profile: null };

export type ResolveViewerDeps = {
  getAuth: () => Promise<{ userId: string | null }>;
  ensureProfile: (userId: string) => Promise<Tables<"profiles">>;
};

// The testable core of viewer resolution: given a way to check auth and a
// way to bootstrap a profile, resolves who's looking right now. No Clerk
// import, no Supabase import, no React — a test fake is two plain
// functions, and importing this file never touches Next's React-cache
// substitution the way lib/identity/viewer.ts (its real-wiring wrapper) does.
export async function resolveViewer(deps: ResolveViewerDeps): Promise<Viewer> {
  const { userId } = await deps.getAuth();
  if (!userId) return { userId: null, profile: null };
  const profile = await deps.ensureProfile(userId);
  return { userId, profile };
}
