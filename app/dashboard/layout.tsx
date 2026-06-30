import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSellerPayoutStatus } from "@/lib/seller";
import { StripeNudge } from "@/components/stripe-nudge";

// Wraps every /dashboard page. Surfaces the Stripe-onboarding nudge only to
// sellers who have published paid components but can't yet receive payment.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  let showNudge = false;

  if (userId) {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("clerk_user_id", userId).maybeSingle();

    if (profile) {
      // Does this seller have at least one published PAID component?
      const { data: paid } = await supabase
        .from("components")
        .select("id")
        .eq("seller_id", (profile as any).id)
        .eq("status", "published")
        .gt("price_cents", 0)
        .limit(1);

      if (paid && paid.length > 0) {
        const status = await getSellerPayoutStatus(profile);
        showNudge = status !== "ready";
      }
    }
  }

  return (
    <>
      {showNudge && <StripeNudge />}
      {children}
    </>
  );
}
