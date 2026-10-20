import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import { queueTranslations } from "@/lib/translation/queue";
import { loadOwnedSource, type SellerTranslationsDb } from "@/lib/translation/seller-edit";

// The translation job runs in after() within this route's time limit.
export const maxDuration = 300;

// POST /api/components/[id]/translations/retry — the owning Seller asks for
// failed or stuck machine Translations to be redone (ADR 0006): the edit
// page's "Translation failed · Retry". Answers once the job is queued;
// readers see the Source text until it finishes.
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const owned = await loadOwnedSource(narrowDb<SellerTranslationsDb>(supabase), params.id, profile.id);
  if (!owned.ok) return toResponse(owned);

  queueTranslations(params.id, { retry: true });
  return NextResponse.json({ queued: true }, { status: 202 });
});
