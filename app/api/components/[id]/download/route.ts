import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================
// THE PAYWALL. This is the single most security-critical route.
// It releases a short-lived signed URL for a component's zip ONLY
// after confirming the requester is entitled to it.
//
// Rule:
//   - Free component  -> any signed-in user may download (and we
//                        record a library entry for re-download).
//   - Paid component  -> the user MUST have a `downloads` row, which
//                        only exists after a succeeded purchase.
//
// Never return components.zip_path directly. Never make the bucket public.
// ============================================================
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to download." }, { status: 401 });

  const supabase = createServiceClient();

  // Resolve profile.
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("clerk_user_id", userId).single();
  if (!profile) return NextResponse.json({ error: "No profile." }, { status: 403 });

  // Load the component.
  const { data: component } = await supabase
    .from("components").select("id, price_cents, zip_path, status").eq("id", params.id).single();
  if (!component || component.status !== "published" || !component.zip_path) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  // Entitlement check.
  if (component.price_cents > 0) {
    const { data: entitlement } = await supabase
      .from("downloads").select("id").eq("user_id", profile.id).eq("component_id", component.id).maybeSingle();
    if (!entitlement) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  } else {
    // Free: ensure a library entry exists (idempotent; trigger bumps count).
    await supabase.from("downloads").upsert(
      { user_id: profile.id, component_id: component.id },
      { onConflict: "user_id,component_id", ignoreDuplicates: true }
    );
  }

  // Issue a short-lived signed URL (60s) — the only thing the client sees.
  const bucket = process.env.SUPABASE_ZIP_BUCKET ?? "component-zips";
  const { data: signed, error } = await supabase.storage
    .from(bucket).createSignedUrl(component.zip_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
