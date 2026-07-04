import { createClient } from "@supabase/supabase-js";
import { clerkSetup } from "@clerk/testing/playwright";

const BUCKET = process.env.SUPABASE_ZIP_BUCKET ?? "component-zips";

// Runs once before the whole suite. Two jobs:
//   1. Fetch a Clerk testing token so auth.setup.ts can bypass bot detection.
//   2. Ensure the private zip bucket exists — it's a manual dashboard step in
//      normal dev (see README's Quick start), not part of the SQL migrations,
//      so a freshly `supabase db reset` database won't have it.
export default async function globalSetup() {
  await clerkSetup({ dotenv: false });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test.local"
    );
  }

  const supabase = createClient(url, serviceKey);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Could not list Supabase storage buckets: ${listError.message}`);

  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (createError) throw new Error(`Could not create the "${BUCKET}" storage bucket: ${createError.message}`);
  }
}
