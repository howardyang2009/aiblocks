import type Stripe from "stripe";
import type { Tables } from "@/types/database";
import { APP_URL } from "@/lib/constants";

export type PayoutStatus = "ready" | "incomplete" | "none";

// The narrow slice of the Stripe client getSellerPayoutStatus touches.
export type PayoutStatusStripe = {
  accounts: {
    retrieve(id: string): Promise<{
      details_submitted?: boolean;
      capabilities?: { transfers?: string };
    }>;
  };
};

// The narrow slice of the Supabase client getSellerPayoutStatus touches.
export type PayoutStatusDb = {
  from(table: "profiles"): {
    update(row: { stripe_onboarding_done: boolean }): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

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
  stripe: PayoutStatusStripe,
  supabase: PayoutStatusDb,
  profile: Tables<"profiles">
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

// The narrow slice of the Supabase client shouldShowStripeNudge touches, on
// top of everything getSellerPayoutStatus already needs.
export type NudgeDb = PayoutStatusDb & {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          gt(column: string, value: number): {
            limit(n: number): PromiseLike<{ data: { id: string }[] | null }>;
          };
        };
      };
    };
  };
};

// True when the seller has paid components but payouts aren't connected yet.
// Used by dashboard layout and seller profile page to decide whether to show
// the Stripe onboarding nudge. Owns the "has a published paid component"
// check itself — callers used to compute that two different ways (a
// dedicated existence query in one, a reduction over already-fetched rows in
// the other), which meant the same business rule lived partly outside this
// module. Only ever called for the profile's own owner (a low-traffic path),
// so the one extra query this costs the caller that already has the
// components list in memory is not worth avoiding at the cost of a second
// definition of the same rule.
export async function shouldShowStripeNudge(
  stripe: PayoutStatusStripe,
  supabase: NudgeDb,
  profile: Tables<"profiles">
): Promise<boolean> {
  const { data: paid } = await supabase
    .from("components")
    .select("id")
    .eq("seller_id", profile.id)
    .eq("status", "published")
    .gt("price_cents", 0)
    .limit(1);
  if (!paid?.length) return false;
  return (await getSellerPayoutStatus(stripe, supabase, profile)) !== "ready";
}

export type StartOnboardingResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

// The narrow slice of the Stripe client startOnboarding touches.
export type OnboardingStripe = {
  accounts: {
    retrieve(id: string): Promise<unknown>;
    create(params: Stripe.AccountCreateParams): Promise<{ id: string }>;
  };
  accountLinks: {
    create(params: Stripe.AccountLinkCreateParams): Promise<{ url: string }>;
  };
};

// The narrow slice of the Supabase client startOnboarding touches.
export type OnboardingDb = {
  from(table: "profiles"): {
    update(row: { stripe_account_id: string; stripe_onboarding_done: boolean }): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

// Start (or resume) Stripe Connect onboarding for a seller and return the
// hosted onboarding link.
export async function startOnboarding(
  stripe: OnboardingStripe,
  supabase: OnboardingDb,
  profile: Tables<"profiles">
): Promise<StartOnboardingResult> {
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

    const { error } = await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId, stripe_onboarding_done: false })
      .eq("id", profile.id);
    if (error) {
      return { ok: false, status: 500, error: "Could not save your Stripe account. Please try again." };
    }
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/dashboard/seller/stripe`,
    return_url: `${APP_URL}/dashboard/seller/stripe?done=1`,
    type: "account_onboarding",
  });

  return { ok: true, url: link.url };
}
