import { describe, it, expect } from "vitest";
import {
  startOnboarding,
  getSellerPayoutStatus,
  shouldShowStripeNudge,
  type OnboardingStripe,
  type OnboardingDb,
  type PayoutStatusStripe,
  type PayoutStatusDb,
  type NudgeDb,
} from "@/lib/seller";
import type { Tables } from "@/types/database";

function profile(overrides: Partial<Tables<"profiles">> = {}): Tables<"profiles"> {
  return {
    avatar_url: null,
    bio: null,
    clerk_user_id: "clerk1",
    created_at: "",
    display_name: null,
    github_url: null,
    id: "profile1",
    stripe_account_id: null,
    stripe_onboarding_done: false,
    twitter_url: null,
    updated_at: "",
    username: "seller",
    website_url: null,
    ...overrides,
  };
}

function fakeOnboardingStripe(opts: {
  retrieve?: () => Promise<unknown>;
  createdAccountId?: string;
  linkUrl?: string;
}): OnboardingStripe {
  return {
    accounts: {
      retrieve: opts.retrieve ?? (async () => ({ id: "acct_existing" })),
      create: async () => ({ id: opts.createdAccountId ?? "acct_new" }),
    },
    accountLinks: {
      create: async () => ({ url: opts.linkUrl ?? "https://connect.stripe.com/setup/acct_new" }),
    },
  };
}

function fakeOnboardingDb(opts: {
  updateError?: { message: string } | null;
}): OnboardingDb {
  return {
    from: () => ({
      update: () => ({
        eq: async () => ({ error: opts.updateError ?? null }),
      }),
    }),
  };
}

describe("startOnboarding", () => {
  it("creates a new account when none is stored", async () => {
    let created = false;
    const stripe = fakeOnboardingStripe({
      retrieve: async () => {
        throw new Error("should not be called when no account id is stored");
      },
      createdAccountId: "acct_new",
    });
    const supabase: OnboardingDb = {
      from: () => ({
        update: (row) => {
          expect(row).toEqual({ stripe_account_id: "acct_new", stripe_onboarding_done: false });
          created = true;
          return { eq: async () => ({ error: null }) };
        },
      }),
    };

    const result = await startOnboarding(stripe, supabase, profile());

    expect(created).toBe(true);
    expect(result).toEqual({ ok: true, url: "https://connect.stripe.com/setup/acct_new" });
  });

  it("reuses a stored account that is still valid", async () => {
    let createCalled = false;
    let updateCalled = false;
    const stripe: OnboardingStripe = {
      accounts: {
        retrieve: async (id) => {
          expect(id).toBe("acct_existing");
          return { id: "acct_existing" };
        },
        create: async () => {
          createCalled = true;
          return { id: "acct_should_not_be_used" };
        },
      },
      accountLinks: {
        create: async () => ({ url: "https://connect.stripe.com/setup/acct_existing" }),
      },
    };
    const supabase: OnboardingDb = {
      from: () => ({
        update: () => {
          updateCalled = true;
          return { eq: async () => ({ error: null }) };
        },
      }),
    };

    const result = await startOnboarding(stripe, supabase, profile({ stripe_account_id: "acct_existing" }));

    expect(createCalled).toBe(false);
    expect(updateCalled).toBe(false); // no new account -> nothing to persist
    expect(result).toEqual({ ok: true, url: "https://connect.stripe.com/setup/acct_existing" });
  });

  it("treats a stale stored account id as missing and recreates it", async () => {
    const stripe = fakeOnboardingStripe({
      retrieve: async () => {
        throw new Error("wrong mode");
      },
      createdAccountId: "acct_recreated",
      linkUrl: "https://connect.stripe.com/setup/acct_recreated",
    });
    const supabase = fakeOnboardingDb({});

    const result = await startOnboarding(stripe, supabase, profile({ stripe_account_id: "acct_stale" }));

    expect(result).toEqual({ ok: true, url: "https://connect.stripe.com/setup/acct_recreated" });
  });

  it("returns ok: false when saving the new account id fails", async () => {
    const stripe = fakeOnboardingStripe({});
    const supabase = fakeOnboardingDb({ updateError: { message: "db down" } });

    const result = await startOnboarding(stripe, supabase, profile());

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Could not save your Stripe account. Please try again.",
    });
  });
});

function fakePayoutStripe(opts: {
  detailsSubmitted?: boolean;
  transfersActive?: boolean;
  throws?: boolean;
}): PayoutStatusStripe {
  return {
    accounts: {
      retrieve: async () => {
        if (opts.throws) throw new Error("stripe hiccup");
        return {
          details_submitted: opts.detailsSubmitted ?? false,
          capabilities: { transfers: opts.transfersActive ? "active" : "inactive" },
        };
      },
    },
  };
}

function fakePayoutDb(opts: { onUpdate?: (row: { stripe_onboarding_done: boolean }) => void }): PayoutStatusDb {
  return {
    from: () => ({
      update: (row) => {
        opts.onUpdate?.(row);
        return { eq: async () => ({ error: null }) };
      },
    }),
  };
}

describe("getSellerPayoutStatus", () => {
  it("returns none when no account is connected", async () => {
    const status = await getSellerPayoutStatus(fakePayoutStripe({}), fakePayoutDb({}), profile());
    expect(status).toBe("none");
  });

  it("returns ready without calling Stripe when already cached", async () => {
    const stripe = fakePayoutStripe({});
    let stripeCalled = false;
    stripe.accounts.retrieve = async () => {
      stripeCalled = true;
      return { details_submitted: true, capabilities: { transfers: "active" } };
    };

    const status = await getSellerPayoutStatus(
      stripe,
      fakePayoutDb({}),
      profile({ stripe_account_id: "acct1", stripe_onboarding_done: true })
    );

    expect(status).toBe("ready");
    expect(stripeCalled).toBe(false);
  });

  it("returns incomplete when Stripe reports the account isn't ready", async () => {
    const status = await getSellerPayoutStatus(
      fakePayoutStripe({ detailsSubmitted: false, transfersActive: false }),
      fakePayoutDb({}),
      profile({ stripe_account_id: "acct1" })
    );
    expect(status).toBe("incomplete");
  });

  it("returns ready and caches the result once Stripe confirms the account", async () => {
    let cached: { stripe_onboarding_done: boolean } | undefined;
    const status = await getSellerPayoutStatus(
      fakePayoutStripe({ detailsSubmitted: true, transfersActive: true }),
      fakePayoutDb({ onUpdate: (row) => (cached = row) }),
      profile({ stripe_account_id: "acct1" })
    );
    expect(status).toBe("ready");
    expect(cached).toEqual({ stripe_onboarding_done: true });
  });

  it("falls back to the stored flag when Stripe errors", async () => {
    const status = await getSellerPayoutStatus(
      fakePayoutStripe({ throws: true }),
      fakePayoutDb({}),
      profile({ stripe_account_id: "acct1", stripe_onboarding_done: true })
    );
    expect(status).toBe("ready");
  });
});

function fakeNudgeDb(opts: {
  paidComponentExists: boolean;
  payoutStatus?: { detailsSubmitted?: boolean; transfersActive?: boolean };
}): NudgeDb {
  return {
    from: (table: string) => {
      if (table === "components") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gt: () => ({
                  limit: async () => ({ data: opts.paidComponentExists ? [{ id: "c1" }] : [] }),
                }),
              }),
            }),
          }),
        };
      }
      return { update: () => ({ eq: async () => ({ error: null }) }) };
    },
  } as NudgeDb;
}

describe("shouldShowStripeNudge", () => {
  it("is false when the seller has no published paid components", async () => {
    const shown = await shouldShowStripeNudge(
      fakePayoutStripe({}),
      fakeNudgeDb({ paidComponentExists: false }),
      profile()
    );
    expect(shown).toBe(false);
  });

  it("is false when payouts are already ready", async () => {
    const shown = await shouldShowStripeNudge(
      fakePayoutStripe({}),
      fakeNudgeDb({ paidComponentExists: true }),
      profile({ stripe_account_id: "acct1", stripe_onboarding_done: true })
    );
    expect(shown).toBe(false);
  });

  it("is true when the seller has a paid component but payouts aren't ready", async () => {
    const shown = await shouldShowStripeNudge(
      fakePayoutStripe({ detailsSubmitted: false, transfersActive: false }),
      fakeNudgeDb({ paidComponentExists: true }),
      profile({ stripe_account_id: "acct1" })
    );
    expect(shown).toBe(true);
  });
});
