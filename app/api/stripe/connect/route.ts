import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/auth";
import { startOnboarding, type OnboardingDb } from "@/lib/seller";
import { narrowDb } from "@/lib/db-port";

// Start (or resume) Stripe Connect onboarding for a seller and return the
// hosted onboarding link.
export const POST = withAuth(async (_req, { profile, supabase }) => {
  const result = await startOnboarding(getStripe(), narrowDb<OnboardingDb>(supabase), profile);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ url: result.url });
});
