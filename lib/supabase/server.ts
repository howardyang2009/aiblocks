import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key.
// This BYPASSES Row Level Security — only ever import it in server code
// (API routes, server actions). NEVER expose it to the browser.
// Every privileged action (releasing a paid download, writing purchase
// records) should go through here AFTER an explicit access check.
//
// NOTE: This client is intentionally untyped at the query layer. Run
//   npx supabase gen types typescript --project-id <id> > types/database.ts
// and pass `createClient<Database>(...)` once you have generated types, to get
// end-to-end query type-safety. The hand-written types in types/database.ts
// are used throughout the app code in the meantime.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env vars are missing. Check .env.local.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
