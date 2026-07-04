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
export async function seedPublishedComponent(
  overrides: Partial<{ name: string; description: string; priceCents: number; ecosystems: string[] }> = {}
) {
  const supabase = serviceClient();
  const stamp = Date.now();

  const clerkUserId = "e2e-seed-seller";
  let sellerId: string;
  const { data: existingSeller } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (existingSeller) {
    sellerId = existingSeller.id;
  } else {
    const { data: createdSeller, error: sellerError } = await supabase
      .from("profiles")
      .insert({ clerk_user_id: clerkUserId, username: "e2e-seed-seller" })
      .select("id")
      .single();
    if (sellerError || !createdSeller) {
      throw new Error(`Could not seed the seller profile: ${sellerError?.message}`);
    }
    sellerId = createdSeller.id;
  }

  const { data: component, error } = await supabase
    .from("components")
    .insert({
      seller_id: sellerId,
      name: overrides.name ?? `E2E Seed Component ${stamp}`,
      slug: `e2e-seed-${stamp}`,
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
