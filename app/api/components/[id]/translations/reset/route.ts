import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import { queueTranslations } from "@/lib/translation/queue";
import { parseResetInput, resetToMachine, type SellerTranslationsDb } from "@/lib/translation/seller-edit";
import { revalidateComponentPages } from "@/lib/component-page-cache";

// The translation job runs in after() within this route's time limit.
export const maxDuration = 300;

// POST /api/components/[id]/translations/reset — discard the Seller's hand
// edit of one field in one Locale and queue a fresh machine Translation
// (ADR 0006, #71): "Reset to machine translation", and "Re-translate" on a
// stale field. Body: { locale, field }.
export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const body = await parseBody<{ locale?: unknown; field?: unknown }>(req);
  if (body instanceof NextResponse) return body;

  const parsed = parseResetInput(body);
  if (!parsed.ok) return toResponse(parsed);

  const reset = await resetToMachine(narrowDb<SellerTranslationsDb>(supabase), {
    componentId: params.id,
    sellerId: profile.id,
    input: parsed.data,
  });
  if (!reset.ok) return toResponse(reset);

  queueTranslations(params.id);
  revalidateComponentPages();
  return NextResponse.json({ queued: true }, { status: 202 });
});
