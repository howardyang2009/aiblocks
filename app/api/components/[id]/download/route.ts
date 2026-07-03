import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import {
  getEntitlement,
  grantEntitlement,
  type DownloadLookupDb,
  type DownloadGrantDb,
} from "@/lib/entitlements";
import { isFreeComponent } from "@/lib/utils";

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

  // Casts below: TypeScript's structural check of the concrete
  // SupabaseClient<Database> against these narrow ports can hit its
  // recursion limit ("Type instantiation is excessively deep") — it's
  // order/cache-sensitive and can pass locally while failing on a clean
  // Vercel build, so we cast defensively at every call site rather than
  // rely on it happening to fit under the limit.
  if (!isFreeComponent(component.price_cents)) {
    // Paid: require an existing entitlement.
    if (!(await getEntitlement(supabase as unknown as DownloadLookupDb, profile.id, component.id))) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  } else {
    // Free: ensure a library entry (idempotent; trigger bumps download_count).
    await grantEntitlement(supabase as unknown as DownloadGrantDb, { userId: profile.id, componentId: component.id });
  }

  const bucket = ACTIVE_ZIP_BUCKET;
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(component.zip_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
});
