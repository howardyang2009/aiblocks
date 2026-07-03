import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { shouldShowStripeNudge } from "@/lib/seller";
import { getViewer } from "@/lib/viewer";
import { StripeNudge } from "@/components/stripe-nudge";

// Wraps every /dashboard page. Surfaces the Stripe-onboarding nudge only to
// sellers who have published paid components but can't yet receive payment.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getViewer();
  const supabase = createServiceClient();
  let showNudge = false;

  if (profile) {
    showNudge = await shouldShowStripeNudge(profile, getStripe(), supabase);
  }

  return (
    <>
      {showNudge && <StripeNudge />}
      {children}
    </>
  );
}
