import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";
import { ZIP_BUCKET } from "@/lib/constants";

// ============================================================
// THE PAYWALL. Releases a short-lived signed URL for a component's zip
// ONLY after confirming the requester is entitled to it.
//   Free component -> any signed-in user (and we record a library entry).
//   Paid component -> requires a `downloads` row (created after purchase).
// Never returns zip_path directly; the bucket stays private.
// ============================================================
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to download." }, { status: 401 });

  // Bootstrap the profile on first action (buyer may never have published).
  const profile = await ensureProfile();
  const supabase = createServiceClient();

  const { data: component } = await supabase
    .from("components")
    .select("id, price_cents, zip_path, status")
    .eq("id", params.id)
    .maybeSingle();

  const c = component as any;
  if (!c || c.status !== "published" || !c.zip_path) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  if (c.price_cents > 0) {
    // Paid: require an existing entitlement.
    const { data: entitlement } = await supabase
      .from("downloads").select("id").eq("user_id", profile.id).eq("component_id", c.id).maybeSingle();
    if (!entitlement) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  } else {
    // Free: ensure a library entry (idempotent; trigger bumps download_count).
    await supabase.from("downloads").upsert(
      { user_id: profile.id, component_id: c.id },
      { onConflict: "user_id,component_id", ignoreDuplicates: true }
    );
  }

  const bucket = process.env.SUPABASE_ZIP_BUCKET ?? ZIP_BUCKET;
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(c.zip_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
