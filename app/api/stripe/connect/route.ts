import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Start (or resume) Stripe Connect onboarding for a seller and return
// the hosted onboarding link.
export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const supabase = createServiceClient();
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data: profile } = await supabase
    .from("profiles").select("id, stripe_account_id").eq("clerk_user_id", userId).single();
  if (!profile) return NextResponse.json({ error: "No profile." }, { status: 403 });

  let accountId = profile.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", profile.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/seller/stripe`,
    return_url: `${appUrl}/dashboard/seller/stripe?done=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
