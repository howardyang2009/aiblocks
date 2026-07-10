import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/identity/auth";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { parseBody } from "@/lib/request";
import {
  parsePublishInput,
  verifyUploadedZip,
  publishComponent,
  type VerifyUploadedZipStorage,
  type PublishComponentDb,
} from "@/lib/commerce/components-write";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/commerce/browse";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

// GET /api/components?q=&sort=&tag=  — browse + search.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const sort = searchParams.get("sort") ?? "newest";
  const tag = searchParams.get("tag")?.trim().toLowerCase() || undefined;

  const { components, error } = await listPublishedComponents(
    narrowDb<ListComponentsDb>(createServiceClient()),
    { q, sort, tag }
  );
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ components });
}

// POST /api/components — create a listing AFTER the zip has been uploaded
// via a signed upload URL. Body:
//   { name, description, readme, ecosystems[], tags[], price, zipPath }
export const POST = withAuth(async (req, { profile, supabase }) => {
  const body = await parseBody<{
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  }>(req);
  if (body instanceof NextResponse) return body;

  const parsed = parsePublishInput(body, profile.id);
  if (!parsed.ok) return toResponse(parsed);

  const verified = await verifyUploadedZip(
    narrowDb<VerifyUploadedZipStorage>(supabase),
    ACTIVE_ZIP_BUCKET,
    parsed.data.zipPath
  );
  if (!verified.ok) return toResponse(verified);

  const published = await publishComponent(narrowDb<PublishComponentDb>(supabase), {
    ...parsed.data,
    sellerId: profile.id,
    sizeBytes: verified.sizeBytes,
  });
  if (!published.ok) return toResponse(published);

  return NextResponse.json({ id: published.id, slug: published.slug });
});
