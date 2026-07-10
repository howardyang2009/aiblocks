import { NextResponse } from "next/server";
import { getStripe } from "@/lib/commerce/stripe";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { createCheckout, type CreateCheckoutDb } from "@/lib/commerce/purchases";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export const POST = withAuth(async (req, { profile: buyer, supabase }) => {
  const body = await parseBody<{ componentId?: unknown; withdrawalWaived?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  const componentId = String(body.componentId ?? "");
  if (!componentId) return NextResponse.json({ error: "Missing component." }, { status: 400 });

  const result = await createCheckout(getStripe(), narrowDb<CreateCheckoutDb>(supabase), {
    buyer,
    componentId,
    withdrawalWaived: body.withdrawalWaived === true,
  });

  if (!result.ok) return toResponse(result);
  return NextResponse.json({ url: result.url });
});
