import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { ZIP_BUCKET } from "@/lib/constants";

// ============================================================
// THE PAYWALL. Releases a short-lived signed URL for a component's zip
// ONLY after confirming the requester is entitled to it.
//   Free component -> any signed-in user (and we record a library entry).
//   Paid component -> requires a `downloads` row (created after purchase).
// Never returns zip_path directly; the bucket stays private.
// ============================================================
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const { data: component } = await supabase
    .from("components")
    .select("id, price_cents, zip_path, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!component || component.status !== "published" || !component.zip_path) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  if (component.price_cents > 0) {
    // Paid: require an existing entitlement.
    const { data: entitlement } = await supabase
      .from("downloads").select("id").eq("user_id", profile.id).eq("component_id", component.id).maybeSingle();
    if (!entitlement) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  } else {
    // Free: ensure a library entry (idempotent; trigger bumps download_count).
    await supabase.from("downloads").upsert(
      { user_id: profile.id, component_id: component.id },
      { onConflict: "user_id,component_id", ignoreDuplicates: true }
    );
  }

  const bucket = process.env.SUPABASE_ZIP_BUCKET ?? ZIP_BUCKET;
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(component.zip_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
});
