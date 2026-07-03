import * as React from "react";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Viewer =
  | { userId: string; profile: Tables<"profiles"> }
  | { userId: null; profile: null };

// Next.js's build substitutes its own React copy (next/dist/compiled/react)
// for Server Components, which exports `cache` — but the installed
// @types/react doesn't declare it. Cast locally rather than augmenting the
// global "react" module, which breaks declaration merging for every other
// file's React imports.
const cache = (React as unknown as { cache: <T extends (...args: never[]) => unknown>(fn: T) => T }).cache;

// The Server Component counterpart to withAuth: resolves who's looking at
// the page and bootstraps their profile row via ensureProfile — the same
// guarantee every API route already gets. Unlike withAuth this never
// rejects; signed-out visitors get a null viewer so the page still renders.
//
// Wrapped in React's cache() so a layout and the page it wraps — separate
// Server Components rendered in the same request — share one resolution
// instead of each paying for their own auth() + ensureProfile() round trip.
// Takes no arguments (builds its own Supabase client) so cache()'s
// argument-identity keying isn't defeated by callers passing in a freshly
// constructed client every time.
export const getViewer = cache(async (): Promise<Viewer> => {
  const { userId } = await auth();
  if (!userId) return { userId: null, profile: null };
  const profile = await ensureProfile(userId, createServiceClient());
  return { userId, profile };
});
