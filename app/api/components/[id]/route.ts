import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import { queueTranslations } from "@/lib/translation/queue";
import { markSourceLanguageChanged, type SellerTranslationsDb } from "@/lib/translation/seller-edit";
import {
  verifyUploadedZip,
  editComponentRequest,
  updateComponent,
  type VerifyUploadedZipStorage,
  type UpdateComponentDb,
} from "@/lib/commerce/components-write";

// The translation job runs in after() within this route's time limit; a
// long readme in three Locales needs more than the platform default.
export const maxDuration = 300;

// PATCH /api/components/[id] — edit an existing Component. Body mirrors POST
// /api/components with one relaxation: zipPath is OPTIONAL. The sequence
// and its ordering rules live in editComponentRequest.
export const PATCH = withAuth(async (req, { params, profile, supabase }) => {
  const body = await parseBody<{
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown; sourceLanguage?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  }>(req);
  if (body instanceof NextResponse) return body;

  const edited = await editComponentRequest(
    {
      verifyZip: (zipPath) => verifyUploadedZip(narrowDb<VerifyUploadedZipStorage>(supabase), ACTIVE_ZIP_BUCKET, zipPath),
      update: (args) => updateComponent(narrowDb<UpdateComponentDb>(supabase), args),
      markSourceLanguageChanged: (id) => markSourceLanguageChanged(narrowDb<SellerTranslationsDb>(supabase), id),
      queueTranslations: (id) => queueTranslations(id),
      removeZip: async (zipPath) => {
        await supabase.storage.from(ACTIVE_ZIP_BUCKET).remove([zipPath]);
      },
    },
    { body, componentId: params.id, sellerId: profile.id }
  );
  if (!edited.ok) return toResponse(edited);
  return NextResponse.json({ id: edited.id });
});
