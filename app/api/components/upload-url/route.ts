import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";
import { ZIP_BUCKET, MAX_ZIP_BYTES } from "@/lib/constants";

// Mint a one-time signed upload URL so the browser can upload the zip
// DIRECTLY to Supabase Storage (good for 10MB — never flows through this
// API route). The object path is namespaced under the seller's profile id,
// which the create route later verifies to prevent path hijacking.
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });

  const profile = await ensureProfile();

  const { size } = await req.json().catch(() => ({}));
  if (typeof size === "number" && size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "Zip exceeds the 10MB limit." }, { status: 413 });
  }

  const path = `${profile.id}/${randomUUID()}.zip`;
  const bucket = process.env.SUPABASE_ZIP_BUCKET ?? ZIP_BUCKET;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: "Could not create upload URL." }, { status: 500 });
  }

  // Client uses storage.uploadToSignedUrl(path, token, file).
  return NextResponse.json({ path, token: data.token });
}
