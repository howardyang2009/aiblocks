import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { getEntitlement, grantEntitlement, type DownloadLookupDb, type DownloadGrantDb } from "@/lib/entitlements";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/components";
import { narrowDb } from "@/lib/db-port";
import { isFreeComponent } from "@/lib/utils";

// ============================================================
// THE PAYWALL. Releases a short-lived signed URL for a component's zip
// ONLY after confirming the requester is entitled to it.
//   Free component -> any signed-in user (and we record a library entry).
//   Paid component -> requires a `downloads` row (created after purchase).
// Never returns zip_path directly; the bucket stays private.
// ============================================================
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const component = await getPublishedComponent(narrowDb<PublishedComponentDb>(supabase), params.id);

  if (!component || !component.zip_path) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  if (!isFreeComponent(component.price_cents)) {
    // Paid: require an existing entitlement.
    if (!(await getEntitlement(narrowDb<DownloadLookupDb>(supabase), profile.id, component.id))) {
      return NextResponse.json({ error: "Purchase required." }, { status: 402 });
    }
  } else {
    // Free: ensure a library entry (idempotent; trigger bumps download_count).
    await grantEntitlement(narrowDb<DownloadGrantDb>(supabase), { userId: profile.id, componentId: component.id });
  }

  const bucket = ACTIVE_ZIP_BUCKET;
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(component.zip_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
});
