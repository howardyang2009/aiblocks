import { describe, it, expect, vi } from "vitest";
import {
  createCheckout,
  fulfillPurchase,
  type CreateCheckoutDb,
  type FulfillPurchaseDb,
  type CheckoutStripe,
} from "@/lib/commerce/purchases";
import type { Tables } from "@/types/database";
import type Stripe from "stripe";

const buyer: Tables<"profiles"> = {
  avatar_url: null,
  bio: null,
  clerk_user_id: "clerk1",
  created_at: "",
  display_name: null,
  github_url: null,
  id: "buyer1",
  stripe_account_id: null,
  stripe_onboarding_done: false,
  twitter_url: null,
  updated_at: "",
  username: "buyer",
  website_url: null,
};

type ComponentRow = Pick<
  Tables<"components">,
  "id" | "name" | "price_cents" | "currency" | "seller_id" | "status"
>;

function fakeCheckoutDb(opts: {
  component?: ComponentRow | null;
  ownsAlready?: boolean;
  seller?: Pick<Tables<"profiles">, "stripe_account_id"> | null;
  insertPurchase?: { data: Pick<Tables<"purchases">, "id"> | null; error: { message: string } | null };
}): CreateCheckoutDb {
  return {
    from: (table: string) => {
      if (table === "components") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.component ?? null }) }) }) };
      }
      if (table === "downloads") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: opts.ownsAlready ? { id: "d1" } : null }) }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.seller ?? null }) }) }) };
      }
      if (table === "purchases") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => opts.insertPurchase ?? { data: { id: "purchase1" }, error: null },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as CreateCheckoutDb;
}

function fakeStripe(create?: CheckoutStripe["checkout"]["sessions"]["create"]): CheckoutStripe {
  return {
    checkout: {
      sessions: {
        create: create ?? (async () => ({ url: "https://stripe.example/session" }) as Stripe.Checkout.Session),
      },
    },
  };
}

const publishedComponent: ComponentRow = {
  id: "c1",
  name: "Widget",
  price_cents: 500,
  currency: "usd",
  seller_id: "seller1",
  status: "published",
};

describe("createCheckout", () => {
  it("rejects when the withdrawal waiver isn't confirmed", async () => {
    const result = await createCheckout(fakeStripe(), fakeCheckoutDb({}), {
      buyer,
      componentId: "c1",
      withdrawalWaived: false,
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Please confirm the digital delivery notice before checking out.",
    });
  });

  it("404s when the component doesn't exist or isn't published", async () => {
    const db = fakeCheckoutDb({ component: null });
    const result = await createCheckout(fakeStripe(), db, { buyer, componentId: "missing", withdrawalWaived: true });
    expect(result).toEqual({ ok: false, status: 404, error: "Component not found." });
  });

  it("rejects buying a free component", async () => {
    const db = fakeCheckoutDb({ component: { ...publishedComponent, price_cents: 0 } });
    const result = await createCheckout(fakeStripe(), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({ ok: false, status: 400, error: "This component is free — just download it." });
  });

  it("rejects buying your own component", async () => {
    const db = fakeCheckoutDb({ component: { ...publishedComponent, seller_id: buyer.id } });
    const result = await createCheckout(fakeStripe(), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({ ok: false, status: 400, error: "You can't buy your own component." });
  });

  it("rejects when the buyer already owns the component", async () => {
    const db = fakeCheckoutDb({ component: publishedComponent, ownsAlready: true });
    const result = await createCheckout(fakeStripe(), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "You already own this — find it in My downloads.",
    });
  });

  it("rejects when the seller can't accept payments", async () => {
    const db = fakeCheckoutDb({ component: publishedComponent, seller: { stripe_account_id: null } });
    const result = await createCheckout(fakeStripe(), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({ ok: false, status: 400, error: "Seller cannot accept payments yet." });
  });

  it("does not call Stripe when the pending purchase insert fails", async () => {
    const create = vi.fn();
    const db = fakeCheckoutDb({
      component: publishedComponent,
      seller: { stripe_account_id: "acct_1" },
      insertPurchase: { data: null, error: { message: "db down" } },
    });
    const result = await createCheckout(fakeStripe(create), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Could not create purchase record. Please try again.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with the pending purchase id in metadata", async () => {
    const create = vi.fn(
      async (_params: Stripe.Checkout.SessionCreateParams) =>
        ({ url: "https://stripe.example/session" }) as Stripe.Checkout.Session
    );
    const db = fakeCheckoutDb({
      component: publishedComponent,
      seller: { stripe_account_id: "acct_1" },
      insertPurchase: { data: { id: "purchase1" }, error: null },
    });
    const result = await createCheckout(fakeStripe(create), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({ ok: true, url: "https://stripe.example/session" });
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0];
    expect(params.metadata).toMatchObject({
      purchase_id: "purchase1",
      component_id: "c1",
      buyer_id: buyer.id,
    });
    expect(params.payment_intent_data).toEqual({ transfer_data: { destination: "acct_1" } });
  });

  it("500s when Stripe returns no session url", async () => {
    const create = vi.fn(async () => ({ url: null }) as unknown as Stripe.Checkout.Session);
    const db = fakeCheckoutDb({
      component: publishedComponent,
      seller: { stripe_account_id: "acct_1" },
      insertPurchase: { data: { id: "purchase1" }, error: null },
    });
    const result = await createCheckout(fakeStripe(create), db, { buyer, componentId: "c1", withdrawalWaived: true });
    expect(result).toEqual({ ok: false, status: 500, error: "Could not start checkout. Please try again." });
  });
});

function fakeFulfillDb(opts: {
  updateError?: { message: string } | null;
  grantError?: { message: string } | null;
}): FulfillPurchaseDb {
  const grant = vi.fn(async () => ({ error: opts.grantError ?? null }));
  return {
    from: (table: string) => {
      if (table === "purchases") {
        return { update: () => ({ eq: async () => ({ error: opts.updateError ?? null }) }) };
      }
      if (table === "downloads") {
        return { upsert: grant };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as FulfillPurchaseDb;
}

function checkoutCompletedEvent(
  metadata: Record<string, string> = { purchase_id: "p1", component_id: "c1", buyer_id: "b1" }
): Stripe.Event {
  return {
    type: "checkout.session.completed",
    data: { object: { id: "sess_1", metadata } },
  } as unknown as Stripe.Event;
}

describe("fulfillPurchase", () => {
  it("no-ops on events other than checkout.session.completed", async () => {
    const event = { type: "payment_intent.succeeded" } as unknown as Stripe.Event;
    const result = await fulfillPurchase(fakeFulfillDb({}), event);
    expect(result).toEqual({ ok: true });
  });

  it("400s when required metadata is missing", async () => {
    const result = await fulfillPurchase(fakeFulfillDb({}), checkoutCompletedEvent({}));
    expect(result).toEqual({ ok: false, status: 400, error: "Missing purchase metadata." });
  });

  it("500s so Stripe retries when marking the purchase succeeded fails", async () => {
    const result = await fulfillPurchase(
      fakeFulfillDb({ updateError: { message: "db down" } }),
      checkoutCompletedEvent()
    );
    expect(result).toEqual({ ok: false, status: 500, error: "Failed to update purchase." });
  });

  it("500s so Stripe retries when granting the entitlement fails", async () => {
    const result = await fulfillPurchase(
      fakeFulfillDb({ grantError: { message: "constraint" } }),
      checkoutCompletedEvent()
    );
    expect(result).toEqual({ ok: false, status: 500, error: "Failed to grant download access." });
  });

  it("marks the purchase succeeded and grants the entitlement", async () => {
    const result = await fulfillPurchase(fakeFulfillDb({}), checkoutCompletedEvent());
    expect(result).toEqual({ ok: true });
  });
});
