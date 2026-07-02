import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Stripe webhook. On a completed checkout we mark the purchase succeeded
// and create the buyer's library entry, which unlocks the download.
// Verify the signature so nobody can forge "paid" events.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret!);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { purchase_id, component_id, buyer_id } = session.metadata ?? {};
    const supabase = createServiceClient();

    const { error: updateErr } = await supabase
      .from("purchases")
      .update({ status: "succeeded", stripe_checkout_session_id: session.id })
      .eq("id", purchase_id);

    // Return 500 on DB failures so Stripe retries the webhook delivery.
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update purchase." }, { status: 500 });
    }

    // Grant access (idempotent). The downloads trigger bumps download_count.
    const { error: upsertErr } = await supabase.from("downloads").upsert(
      { user_id: buyer_id, component_id, purchase_id },
      { onConflict: "user_id,component_id", ignoreDuplicates: true }
    );

    if (upsertErr) {
      return NextResponse.json({ error: "Failed to grant download access." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
