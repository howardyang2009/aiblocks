import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Server-only Supabase client using the SERVICE ROLE key.
// This BYPASSES Row Level Security. The `server-only` import above makes an
// accidental import from a "use client" module a build error rather than a
// silent runtime failure. NEVER expose it to the browser.
// Every privileged action (releasing a paid download, writing purchase
// records) should go through here AFTER an explicit access check.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env vars are missing. Check .env.local.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
