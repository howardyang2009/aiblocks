import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to buy." }, { status: 401 });

  const { componentId } = await req.json();
  const supabase = createServiceClient();

  const { data: buyer } = await supabase
    .from("profiles").select("id").eq("clerk_user_id", userId).single();
  const { data: component } = await supabase
    .from("components")
    .select("id, name, price_cents, currency, seller_id")
    .eq("id", componentId).single();
  if (!buyer || !component || component.price_cents <= 0) {
    return NextResponse.json({ error: "Invalid component." }, { status: 400 });
  }

  const { data: seller } = await supabase
    .from("profiles").select("stripe_account_id").eq("id", component.seller_id).single();
  if (!seller?.stripe_account_id) {
    return NextResponse.json({ error: "Seller cannot accept payments yet." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  // Create a pending purchase first so the webhook can reconcile by id.
  const { data: purchase } = await supabase
    .from("purchases")
    .insert({
      buyer_id: buyer.id,
      component_id: component.id,
      seller_id: component.seller_id,
      amount_cents: component.price_cents,
      currency: component.currency,
      status: "pending",
    })
    .select("id").single();

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
    metadata: { purchase_id: purchase?.id ?? "", component_id: component.id, buyer_id: buyer.id },
    success_url: `${appUrl}/components/${component.id}?paid=1`,
    cancel_url: `${appUrl}/components/${component.id}?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
