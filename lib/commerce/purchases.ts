import type Stripe from "stripe";
import type { Tables, TablesInsert } from "@/types/database";
import { APP_URL } from "@/lib/constants";
import { getEntitlement, grantEntitlement, type EntitlementLookupDb, type EntitlementGrantDb } from "@/lib/commerce/entitlements";
import { isFreeComponent } from "@/lib/utils";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client createCheckout touches — a test
// fake only needs these four tiny methods, not the full query-builder API.
export type CreateCheckoutDb = EntitlementLookupDb & {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{
          data: Pick<Tables<"components">, "id" | "name" | "price_cents" | "currency" | "seller_id" | "status"> | null;
        }>;
      };
    };
  };
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Pick<Tables<"profiles">, "stripe_account_id"> | null }>;
      };
    };
  };
  from(table: "purchases"): {
    insert(row: TablesInsert<"purchases">): {
      select(columns: string): {
        single(): PromiseLike<{
          data: Pick<Tables<"purchases">, "id"> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

// The narrow slice of the Stripe client createCheckout touches.
export type CheckoutStripe = {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>;
    };
  };
};

// Everything needed to buy a paid component: entitlement/eligibility checks,
// the pending purchase row (so the webhook can reconcile by id), and the
// Stripe Checkout Session itself — the buyer -> seller leg of the same
// transaction fulfillPurchase() completes on the other side.
export async function createCheckout(
  stripe: CheckoutStripe,
  supabase: CreateCheckoutDb,
  args: { buyer: Tables<"profiles">; componentId: string; withdrawalWaived: boolean }
): Promise<CheckoutResult> {
  // EU/EEA Consumer Rights Directive (Art. 16(m)): buyers get a 14-day
  // withdrawal right on digital content unless they've expressly consented
  // to immediate delivery and acknowledged that this waives that right.
  // The checkbox lives in components/download-button.tsx; this is the
  // server-side enforcement so the waiver can't be skipped by calling
  // this endpoint directly. See Terms Section 7.
  if (!args.withdrawalWaived) {
    return {
      ok: false,
      status: 400,
      error: "Please confirm the digital delivery notice before checking out.",
    };
  }

  const { data: component } = await supabase
    .from("components")
    .select("id, name, price_cents, currency, seller_id, status")
    .eq("id", args.componentId)
    .maybeSingle();

  if (!component || component.status !== "published") {
    return { ok: false, status: 404, error: "Component not found." };
  }
  if (isFreeComponent(component.price_cents)) {
    return { ok: false, status: 400, error: "This component is free — just download it." };
  }
  if (component.seller_id === args.buyer.id) {
    return { ok: false, status: 400, error: "You can't buy your own component." };
  }

  // Already owns it? Don't double-charge.
  if (await getEntitlement(supabase, args.buyer.id, component.id)) {
    return { ok: false, status: 400, error: "You already own this — find it in My downloads." };
  }

  const { data: seller } = await supabase
    .from("profiles").select("stripe_account_id").eq("id", component.seller_id).maybeSingle();
  if (!seller || !seller.stripe_account_id) {
    return { ok: false, status: 400, error: "Seller cannot accept payments yet." };
  }

  // Create a pending purchase first so the webhook can reconcile by id.
  // Guard the error: if the insert fails we must NOT proceed to Stripe —
  // charging the buyer with purchase_id="" means the webhook can never
  // match the row and the buyer would pay without receiving their download.
  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      buyer_id: args.buyer.id,
      component_id: component.id,
      seller_id: component.seller_id,
      amount_cents: component.price_cents,
      currency: component.currency,
      status: "pending",
      withdrawal_waived: true,
      withdrawal_waived_at: new Date().toISOString(),
    })
    .select("id").single();

  if (purchaseErr || !purchase) {
    return { ok: false, status: 500, error: "Could not create purchase record. Please try again." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: component.currency,
          product_data: { name: component.name },
          unit_amount: component.price_cents,
        },
        quantity: 1,
      },
    ],
    // 0% platform fee at launch: full amount routed to the seller.
    payment_intent_data: { transfer_data: { destination: seller.stripe_account_id } },
    metadata: {
      purchase_id: purchase.id,
      component_id: component.id,
      buyer_id: args.buyer.id,
      withdrawal_waived: "true",
    },
    // Second, Stripe-enforced consent layer on top of the checkbox in
    // download-button.tsx: Stripe requires the buyer to check a ToS box
    // before paying, and records that acceptance on its own side too.
    // Requires a Terms of Service URL set in the Stripe Dashboard
    // (Settings -> Business -> Public details -> Terms of service link ->
    // https://aiblocks-six.vercel.app/terms), or Stripe will reject this.
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I agree to the [Terms of Service](" + APP_URL + "/terms), and I want immediate access to this digital component — I understand this means I give up my 14-day EU/EEA right of withdrawal.",
      },
    },
    success_url: `${APP_URL}/components/${component.id}?paid=1`,
    cancel_url: `${APP_URL}/components/${component.id}?canceled=1`,
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Could not start checkout. Please try again." };
  }
  return { ok: true, url: session.url };
}

export type FulfillResult = { ok: true } | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client fulfillPurchase touches.
export type FulfillPurchaseDb = EntitlementGrantDb & {
  from(table: "purchases"): {
    update(row: { status: string; stripe_checkout_session_id: string }): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

// The other side of the same transaction createCheckout() starts: called
// from the Stripe webhook once payment succeeds. Marks the purchase
// succeeded and grants the download entitlement. Returning `ok: false`
// signals the route to respond with a 5xx so Stripe retries delivery.
export async function fulfillPurchase(
  supabase: FulfillPurchaseDb,
  event: Stripe.Event
): Promise<FulfillResult> {
  if (event.type !== "checkout.session.completed") return { ok: true };

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const { purchase_id: purchaseId, component_id: componentId, buyer_id: buyerId } = metadata;
  if (!purchaseId || !componentId || !buyerId) {
    return { ok: false, status: 400, error: "Missing purchase metadata." };
  }

  const { error: updateErr } = await supabase
    .from("purchases")
    .update({ status: "succeeded", stripe_checkout_session_id: session.id })
    .eq("id", purchaseId);

  // Return an error so the route 500s and Stripe retries the webhook delivery.
  if (updateErr) {
    return { ok: false, status: 500, error: "Failed to update purchase." };
  }

  const { error: grantErr } = await grantEntitlement(supabase, {
    userId: buyerId,
    componentId,
    purchaseId,
  });
  if (grantErr) {
    return { ok: false, status: 500, error: "Failed to grant download access." };
  }

  return { ok: true };
}
