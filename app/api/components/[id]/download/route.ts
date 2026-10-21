import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { toResponse } from "@/lib/result";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { getEntitlement, grantEntitlement, type EntitlementLookupDb, type EntitlementGrantDb } from "@/lib/commerce/entitlements";
import { getPublishedComponent, type PublishedComponentDb } from "@/lib/commerce/components";
import { authorizeDownload } from "@/lib/commerce/downloads";
import { narrowDb } from "@/lib/db-port";

// The paywall itself lives in lib/commerce/downloads.ts; this route only
// wires the Supabase-backed dependencies into it.
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await authorizeDownload(
    {
      findComponent: (id) => getPublishedComponent(narrowDb<PublishedComponentDb>(supabase), id),
      hasEntitlement: (userId, componentId) =>
        getEntitlement(narrowDb<EntitlementLookupDb>(supabase), userId, componentId),
      grantEntitlement: (userId, componentId) =>
        grantEntitlement(narrowDb<EntitlementGrantDb>(supabase), { userId, componentId }),
      signZipUrl: async (zipPath) => {
        const { data, error } = await supabase.storage.from(ACTIVE_ZIP_BUCKET).createSignedUrl(zipPath, 60);
        return error || !data ? null : data.signedUrl;
      },
    },
    { profileId: profile.id, componentId: params.id }
  );
  if (!result.ok) return toResponse(result);
  return NextResponse.json({ url: result.url });
});
