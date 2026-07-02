import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";

// Start (or resume) Stripe Connect onboarding for a seller and return the
// hosted onboarding link.
export const POST = withAuth(async (_req, { profile, supabase }) => {
  const stripe = getStripe();

  let accountId: string | null = profile.stripe_account_id ?? null;

  // A stored account id can be STALE after switching Stripe modes: an account
  // created in test mode does not exist under live keys (and vice-versa).
  // Verify it still exists under the CURRENT keys; if not, drop it and recreate.
  if (accountId) {
    try {
      await stripe.accounts.retrieve(accountId);
    } catch {
      accountId = null; // wrong mode / deleted -> recreate below
    }
  }

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      // Explicitly request the transfers capability — required for the
      // destination charges your checkout route uses.
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId, stripe_onboarding_done: false })
      .eq("id", profile.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/dashboard/seller/stripe`,
    return_url: `${APP_URL}/dashboard/seller/stripe?done=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
});
