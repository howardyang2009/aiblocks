import { createClient } from "@supabase/supabase-js";

// Browser-safe Supabase client (anon key). Subject to Row Level Security.
// Use this in client components for reads that RLS permits.
//
// NOTE: Untyped at the query layer for now — generate types and switch to
// `createClient<Database>(...)` for full query type-safety (see server.ts).
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
