import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing — check .env.test.local");
  return createClient(url, key);
}

// Inserts a published component directly, bypassing the UI, for specs whose
// concern is reading (browse/search) rather than publishing — the publish
// flow itself is exercised for real by publish-and-engage.spec.ts. Keeps
// browse.spec.ts independent of the Clerk sign-in harness.
//
// `fullyParallel: true` (playwright.config.ts) lets Playwright split a
// single describe block's tests across several worker processes, each
// running its own copy of `beforeAll` — so this can run CONCURRENTLY, more
// than once, for the same test run. Both writes below are shaped to be safe
// under that: the shared seller profile is upserted (one atomic statement,
// not a check-then-insert that two workers can both pass), and the slug
// carries a random suffix so two workers seeding in the same millisecond
// don't collide on `components_slug_key`.
export async function seedPublishedComponent(
  overrides: Partial<{ name: string; description: string; priceCents: number; ecosystems: string[] }> = {}
) {
  const supabase = serviceClient();
  const stamp = Date.now();

  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .upsert(
      { clerk_user_id: "e2e-seed-seller", username: "e2e-seed-seller" },
      { onConflict: "clerk_user_id" }
    )
    .select("id")
    .single();
  if (sellerError || !seller) {
    throw new Error(`Could not seed the seller profile: ${sellerError?.message}`);
  }

  const { data: component, error } = await supabase
    .from("components")
    .insert({
      seller_id: seller.id,
      name: overrides.name ?? `E2E Seed Component ${stamp}`,
      slug: `e2e-seed-${stamp}-${Math.random().toString(36).slice(2, 8)}`,
      description: overrides.description ?? "Seeded directly for browse/search e2e coverage.",
      ecosystems: overrides.ecosystems ?? ["claude"],
      price_cents: overrides.priceCents ?? 0,
      status: "published",
    })
    .select("id, name, slug")
    .single();
  if (error || !component) throw new Error(`Could not seed the component: ${error?.message}`);

  return component;
}
