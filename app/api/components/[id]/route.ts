import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { narrowDb } from "@/lib/db-port";
import {
  verifyUploadedZip,
  parseEditInput,
  updateComponent,
  type VerifyUploadedZipStorage,
  type UpdateComponentDb,
} from "@/lib/commerce/components-write";

// PATCH /api/components/[id] — edit an existing listing. Body mirrors POST
// /api/components with one relaxation: zipPath is OPTIONAL. When present
// (a fresh signed upload just landed) the old storage object is removed
// AFTER the DB update succeeds; when absent the current zip stays put.
export const PATCH = withAuth(async (req, { params, profile, supabase }) => {
  const body = await parseBody<{
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  }>(req);
  if (body instanceof NextResponse) return body;

  const parsed = parseEditInput(body, profile.id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  // Only verify the uploaded zip when the seller actually replaced it.
  // Same size cap + missing-file check as on publish.
  let sizeBytes: number | null = null;
  if (parsed.data.zipPath) {
    const verified = await verifyUploadedZip(
      narrowDb<VerifyUploadedZipStorage>(supabase),
      ACTIVE_ZIP_BUCKET,
      parsed.data.zipPath
    );
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });
    sizeBytes = verified.sizeBytes;
  }

  const updated = await updateComponent(narrowDb<UpdateComponentDb>(supabase), {
    ...parsed.data,
    componentId: params.id,
    sellerId: profile.id,
    sizeBytes,
  });
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  // Best-effort cleanup: if the seller replaced the zip, delete the old
  // storage object so it doesn't linger. A failure here doesn't fail the
  // request — the new zip is already the one users will download; a
  // stranded blob is only wasted storage, not a broken listing.
  if (updated.newZipPath && updated.oldZipPath && updated.oldZipPath !== updated.newZipPath) {
    try {
      await supabase.storage.from(ACTIVE_ZIP_BUCKET).remove([updated.oldZipPath]);
    } catch {
      // swallow — see comment above
    }
  }

  return NextResponse.json({ id: updated.id });
});
