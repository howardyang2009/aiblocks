import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/request";
import { APP_URL } from "@/lib/constants";
import { getEntitlement } from "@/lib/entitlements";
import { isFreeComponent } from "@/lib/utils";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export const POST = withAuth(async (req, { profile: buyer, supabase }) => {
  const body = await parseBody<{ componentId?: unknown; withdrawalWaived?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  const componentId = String(body.componentId ?? "");
  if (!componentId) return NextResponse.json({ error: "Missing component." }, { status: 400 });

  // EU/EEA Consumer Rights Directive (Art. 16(m)): buyers get a 14-day
  // withdrawal right on digital content unless they've expressly consented
  // to immediate delivery and acknowledged that this waives that right.
  // The checkbox lives in components/download-button.tsx; this is the
  // server-side enforcement so the waiver can't be skipped by calling
  // this endpoint directly. See Terms Section 7.
  const withdrawalWaived = body.withdrawalWaived === true;
  if (!withdrawalWaived) {
    return NextResponse.json(
      { error: "Please confirm the digital delivery notice before checking out." },
      { status: 400 }
    );
  }

  const { data: component } = await supabase
    .from("components")
    .select("id, name, price_cents, currency, seller_id, status")
    .eq("id", componentId)
    .maybeSingle();

  if (!component || component.status !== "published") {
    return NextResponse.json({ error: "Component not found." }, { status: 404 });
  }

  if (isFreeComponent(component.price_cents)) {
    return NextResponse.json({ error: "This component is free — just download it." }, { status: 400 });
  }
  if (component.seller_id === buyer.id) {
    return NextResponse.json({ error: "You can't buy your own component." }, { status: 400 });
  }

  // Already owns it? Don't double-charge.
  if (await getEntitlement(supabase, buyer.id, component.id)) {
    return NextResponse.json({ error: "You already own this — find it in My downloads." }, { status: 400 });
  }

  const { data: seller } = await supabase
    .from("profiles").select("stripe_account_id").eq("id", component.seller_id).maybeSingle();
  if (!seller || !seller.stripe_account_id) {
    return NextResponse.json({ error: "Seller cannot accept payments yet." }, { status: 400 });
  }

  const stripe = getStripe();

  // Create a pending purchase first so the webhook can reconcile by id.
  // Guard the error: if the insert fails we must NOT proceed to Stripe —
  // charging the buyer with purchase_id="" means the webhook can never
  // match the row and the buyer would pay without receiving their download.
  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      buyer_id: buyer.id,
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
    return NextResponse.json(
      { error: "Could not create purchase record. Please try again." },
      { status: 500 }
    );
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
      buyer_id: buyer.id,
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

  return NextResponse.json({ url: session.url });
});
