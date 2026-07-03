import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { shouldShowStripeNudge } from "@/lib/seller";
import { getViewer } from "@/lib/viewer";
import { StripeNudge } from "@/components/stripe-nudge";

// Wraps every /dashboard page. Surfaces the Stripe-onboarding nudge only to
// sellers who have published paid components but can't yet receive payment.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServiceClient();
  const { profile } = await getViewer(supabase);
  let showNudge = false;

  if (profile) {
    // Does this seller have at least one published PAID component?
    const { data: paid } = await supabase
      .from("components")
      .select("id")
      .eq("seller_id", profile.id)
      .eq("status", "published")
      .gt("price_cents", 0)
      .limit(1);

    showNudge = await shouldShowStripeNudge(profile, (paid?.length ?? 0) > 0, getStripe(), supabase);
  }

  return (
    <>
      {showNudge && <StripeNudge />}
      {children}
    </>
  );
}
