import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { exceedsZipSizeLimit } from "@/lib/constants";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { parseBody } from "@/lib/request";
import { createUploadUrl, type CreateUploadUrlStorage } from "@/lib/commerce/components-write";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";

export const POST = withAuth(async (req, { profile, supabase }) => {
  const body = await parseBody<{ size?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  if (typeof body.size === "number" && exceedsZipSizeLimit(body.size)) {
    return NextResponse.json({ error: "Zip exceeds the 10MB limit." }, { status: 413 });
  }

  const result = await createUploadUrl(narrowDb<CreateUploadUrlStorage>(supabase), ACTIVE_ZIP_BUCKET, profile.id);
  if (!result.ok) return toResponse(result);

  // Return the bucket so the client can upload to the exact same bucket the
  // token was minted for, even if SUPABASE_ZIP_BUCKET overrides the default.
  return NextResponse.json({ path: result.path, token: result.token, bucket: ACTIVE_ZIP_BUCKET });
});
