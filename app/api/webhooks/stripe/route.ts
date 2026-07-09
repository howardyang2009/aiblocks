import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/commerce/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { fulfillPurchase, type FulfillPurchaseDb } from "@/lib/commerce/purchases";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

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

  const result = await fulfillPurchase(narrowDb<FulfillPurchaseDb>(createServiceClient()), event);
  if (!result.ok) return toResponse(result);

  return NextResponse.json({ received: true });
}
