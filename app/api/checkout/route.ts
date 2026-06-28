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
    metadata: { purchase_id: (purchase as any)?.id ?? "", component_id: c.id, buyer_id: buyer.id },
    success_url: `${appUrl}/components/${c.id}?paid=1`,
    cancel_url: `${appUrl}/components/${c.id}?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
