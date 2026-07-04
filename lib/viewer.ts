import * as React from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureProfile, type EnsureProfileDb } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { resolveViewer, type Viewer } from "@/lib/resolve-viewer";

export type { Viewer } from "@/lib/resolve-viewer";

// Next.js's build substitutes its own React copy (next/dist/compiled/react)
// for Server Components, which exports `cache` — but the installed
// @types/react doesn't declare it, and a plain Node/test React build
// doesn't have it at all. Cast locally rather than augmenting the global
// "react" module, which breaks declaration merging for every other file's
// React imports. (This is exactly why the testable logic lives in
// lib/resolve-viewer.ts instead of here — importing *this* file outside
// Next's bundler throws, since `cache` is undefined.)
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
// constructed client every time. The real Clerk/Supabase wiring lives here,
// at the thin edge — resolveViewer() in lib/resolve-viewer.ts is where the
// actual logic is, and it doesn't know Clerk or Supabase exist.
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = createServiceClient();
  return resolveViewer({
    getAuth: auth,
    ensureProfile: (userId) => ensureProfile(userId, narrowDb<EnsureProfileDb>(supabase), currentUser),
  });
});
