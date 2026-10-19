import { NextResponse } from "next/server";
import { getStripe } from "@/lib/commerce/stripe";
import { withAuth } from "@/lib/identity/auth";
import { startOnboarding, type OnboardingDb } from "@/lib/commerce/seller";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import { parseLocale } from "@/i18n/locale-url";

// Start (or resume) Stripe Connect onboarding for a seller and return the
// hosted onboarding link that returns to the Seller's Locale.
export const POST = withAuth(async (req, { profile, supabase }) => {
  // A request without a body has no locale either: parseLocale falls back to `de`.
  const body: { locale?: unknown } = await req.json().catch(() => ({}));
  const result = await startOnboarding(getStripe(), narrowDb<OnboardingDb>(supabase), profile, parseLocale(body.locale));

  if (!result.ok) return toResponse(result);
  return NextResponse.json({ url: result.url });
});
