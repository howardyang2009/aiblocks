import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/request";
import { createCheckout, type CreateCheckoutDb } from "@/lib/purchases";

// Create a Stripe Checkout session for a paid component.
// Money flows buyer -> seller via Stripe Connect (0% platform fee for now).
export const POST = withAuth(async (req, { profile: buyer, supabase }) => {
  const body = await parseBody<{ componentId?: unknown; withdrawalWaived?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  const componentId = String(body.componentId ?? "");
  if (!componentId) return NextResponse.json({ error: "Missing component." }, { status: 400 });

  // CreateCheckoutDb's composed intersection type (4 overloaded `from()`
  // signatures) is too complex for TypeScript to structurally verify against
  // the full SupabaseClient<Database> type without hitting its recursion
  // limit ("Type instantiation is excessively deep") — same underlying issue
  // as in view-model.ts, just triggered here by the type's own complexity
  // rather than by many chained queries in scope.
  const result = await createCheckout(getStripe(), supabase as unknown as CreateCheckoutDb, {
    buyer,
    componentId,
    withdrawalWaived: body.withdrawalWaived === true,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ url: result.url });
});
