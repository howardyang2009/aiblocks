import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { isOwnedBySeller } from "@/lib/commerce/components-write";
import { queueTranslations } from "@/lib/translation/queue";

// The translation job runs in after() within this route's time limit.
export const maxDuration = 300;

// POST /api/components/[id]/translations/retry — the owning Seller asks for
// failed or stuck machine Translations to be redone (ADR 0006). Answers once
// the job is queued; readers see the Source text until it finishes. The
// edit page's Retry button (#71) calls this.
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const { data: component } = await supabase
    .from("components")
    .select("seller_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!component) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!isOwnedBySeller(component, profile.id)) return NextResponse.json({ error: "notOwner" }, { status: 403 });

  queueTranslations(params.id, { retry: true });
  return NextResponse.json({ queued: true }, { status: 202 });
});
