import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/request";
import { createCheckout, toCreateCheckoutDb } from "@/lib/purchases";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export const POST = withAuth(async (req, { profile: buyer, supabase }) => {
  const body = await parseBody<{ componentId?: unknown; withdrawalWaived?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  const componentId = String(body.componentId ?? "");
  if (!componentId) return NextResponse.json({ error: "Missing component." }, { status: 400 });

  const result = await createCheckout(getStripe(), toCreateCheckoutDb(supabase), {
    buyer,
    componentId,
    withdrawalWaived: body.withdrawalWaived === true,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ url: result.url });
});
