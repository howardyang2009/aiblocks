import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Browser-safe Supabase client (anon key). Subject to Row Level Security.
// Use this in client components for reads that RLS permits.
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
