import { NextResponse } from "next/server";
import { getStripe } from "@/lib/commerce/stripe";
import { withAuth } from "@/lib/identity/auth";
import { startOnboarding, type OnboardingDb } from "@/lib/commerce/seller";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

// Start (or resume) Stripe Connect onboarding for a seller and return the
// hosted onboarding link.
export const POST = withAuth(async (_req, { profile, supabase }) => {
  const result = await startOnboarding(getStripe(), narrowDb<OnboardingDb>(supabase), profile);

  if (!result.ok) return toResponse(result);
  return NextResponse.json({ url: result.url });
});
