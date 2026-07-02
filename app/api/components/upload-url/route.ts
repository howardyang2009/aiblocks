import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withAuth } from "@/lib/auth";
import { MAX_ZIP_BYTES } from "@/lib/constants";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { parseBody } from "@/lib/request";

// Mint a one-time signed upload URL so the browser can upload the zip
// DIRECTLY to Supabase Storage (good for 10MB — never flows through this
// API route). The object path is namespaced under the seller's profile id,
// which the create route later verifies to prevent path hijacking.
export const POST = withAuth(async (req, { profile, supabase }) => {
  const body = await parseBody<{ size?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  if (typeof body.size === "number" && body.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "Zip exceeds the 10MB limit." }, { status: 413 });
  }

  const path = `${profile.id}/${randomUUID()}.zip`;

  const { data, error } = await supabase.storage.from(ACTIVE_ZIP_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: "Could not create upload URL." }, { status: 500 });
  }

  // Return the bucket so the client can upload to the exact same bucket the
  // token was minted for, even if SUPABASE_ZIP_BUCKET overrides the default.
  return NextResponse.json({ path, token: data.token, bucket: ACTIVE_ZIP_BUCKET });
});
