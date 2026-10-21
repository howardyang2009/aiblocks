import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import {
  parseHandTranslationInput,
  saveHandTranslations,
  type SellerTranslationsDb,
} from "@/lib/translation/seller-edit";
import { revalidateComponentPages } from "@/lib/component-page-cache";

// PUT /api/components/[id]/translations — the owning Seller's own
// Translation of one Locale (ADR 0006, #71). Body: { locale, description?,
// readme? }, only the fields they changed. Saved as hand Translations,
// which the machine job never overwrites.
export const PUT = withAuth(async (req, { params, profile, supabase }) => {
  const body = await parseBody<{ locale?: unknown; description?: unknown; readme?: unknown }>(req);
  if (body instanceof NextResponse) return body;

  const parsed = parseHandTranslationInput(body);
  if (!parsed.ok) return toResponse(parsed);

  const saved = await saveHandTranslations(narrowDb<SellerTranslationsDb>(supabase), {
    componentId: params.id,
    sellerId: profile.id,
    input: parsed.data,
  });
  if (!saved.ok) return toResponse(saved);
  revalidateComponentPages();
  return NextResponse.json({ ok: true });
});
