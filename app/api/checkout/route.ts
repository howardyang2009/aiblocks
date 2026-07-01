import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to buy." }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
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

  // Bootstrap the buyer's profile on first action (they may never have published).
  const buyer = await ensureProfile();
  const supabase = createServiceClient();

  const { data: component } = await supabase
    .from("components")
    .select("id, name, price_cents, currency, seller_id, status")
    .eq("id", componentId)
    .maybeSingle();

  if (!component || (component as any).status !== "published") {
    return NextResponse.json({ error: "Component not found." }, { status: 404 });
  }
  const c = component as any;

  if (c.price_cents <= 0) {
    return NextResponse.json({ error: "This component is free — just download it." }, { status: 400 });
  }
  if (c.seller_id === buyer.id) {
    return NextResponse.json({ error: "You can't buy your own component." }, { status: 400 });
  }

  // Already owns it? Don't double-charge.
  const { data: existing } = await supabase
    .from("downloads").select("id").eq("user_id", buyer.id).eq("component_id", c.id).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already own this — find it in My downloads." }, { status: 400 });
  }

  const { data: seller } = await supabase
    .from("profiles").select("stripe_account_id").eq("id", c.seller_id).maybeSingle();
  if (!seller || !(seller as any).stripe_account_id) {
    return NextResponse.json({ error: "Seller cannot accept payments yet." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  // Create a pending purchase first so the webhook can reconcile by id.
  const { data: purchase } = await supabase
    .from("purchases")
    .insert({
      buyer_id: buyer.id,
      component_id: c.id,
      seller_id: c.seller_id,
      amount_cents: c.price_cents,
      currency: c.currency,
      status: "pending",
      withdrawal_waived: true,
      withdrawal_waived_at: new Date().toISOString(),
    })
    .select("id").single();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: c.currency,
          product_data: { name: c.name },
          unit_amount: c.price_cents,
        },
        quantity: 1,
      },
    ],
    // 0% platform fee at launch: full amount routed to the seller.
    payment_intent_data: { transfer_data: { destination: (seller as any).stripe_account_id } },
    metadata: {
      purchase_id: (purchase as any)?.id ?? "",
      component_id: c.id,
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
          "I agree to the [Terms of Service](" + appUrl + "/terms), and I want immediate access to this digital component — I understand this means I give up my 14-day EU/EEA right of withdrawal.",
      },
    },
    success_url: `${appUrl}/components/${c.id}?paid=1`,
    cancel_url: `${appUrl}/components/${c.id}?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
