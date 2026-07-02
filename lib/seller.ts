import Stripe from "stripe";
import type { Tables } from "@/types/database";
import type { createServiceClient } from "@/lib/supabase/server";

export type PayoutStatus = "ready" | "incomplete" | "none";

// Determine whether a seller can actually receive payments.
//
// We can't trust a stored flag alone: `stripe_onboarding_done` only becomes
// true once Stripe confirms the account is usable. So we check the live Stripe
// account state, and CACHE a positive result back to the profile so we never
// have to call Stripe again once the seller is fully set up.
//
//   "none"       -> no connected account yet
//   "incomplete" -> account exists but can't receive transfers yet
//   "ready"      -> good to go (cached after first confirmation)
export async function getSellerPayoutStatus(
  profile: Tables<"profiles">,
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceClient>
): Promise<PayoutStatus> {
  if (!profile?.stripe_account_id) return "none";
  if (profile.stripe_onboarding_done) return "ready"; // cached — no Stripe call

  try {
    const acct = await stripe.accounts.retrieve(profile.stripe_account_id);
    const ready =
      acct.details_submitted === true && acct.capabilities?.transfers === "active";

    if (ready) {
      // Cache it so future dashboard loads skip the Stripe round-trip.
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_done: true })
        .eq("id", profile.id);
      return "ready";
    }
    return "incomplete";
  } catch {
    // Never let a Stripe hiccup crash the dashboard; fall back to the flag.
    return profile.stripe_onboarding_done ? "ready" : "incomplete";
  }
}
