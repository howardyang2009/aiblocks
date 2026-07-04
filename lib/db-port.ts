import type { createServiceClient } from "@/lib/supabase/server";

type RealDb = ReturnType<typeof createServiceClient>;

// Narrows the real Supabase client down to whatever minimal structural
// shape a function actually calls (a "port") — a test fake only needs to
// implement the one chain it's given, not the whole query-builder API.
//
// TypeScript's structural check of the full generic SupabaseClient<Database>
// against a narrow port can hit its recursion limit ("Type instantiation is
// excessively deep") — it's order/cache-sensitive and can pass locally
// while failing on a clean CI build (this broke a production deploy once
// already). One generic cast here replaces a hand-rolled `to*Db` factory
// per operation; only the port type itself (what the function actually
// touches) still needs declaring at each call site.
export function narrowDb<T>(supabase: RealDb): T {
  return supabase as unknown as T;
}
