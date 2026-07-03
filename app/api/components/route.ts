import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/auth";
import { COMPONENT_SUMMARY_COLS } from "@/lib/constants";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { parseBody } from "@/lib/request";
import { parsePublishInput, verifyUploadedZip, publishComponent } from "@/lib/publish";

// GET /api/components?q=&sort=  — browse + search.
// Uses Postgres full-text search on the generated search_tsv column.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") ?? "newest";

  const supabase = createServiceClient();
  let query = supabase
    .from("components")
    .select(COMPONENT_SUMMARY_COLS)
    .eq("status", "published");

  if (q) query = query.textSearch("search_tsv", q, { type: "websearch" });

  const order =
    sort === "downloads" ? "download_count" : sort === "stars" ? "star_count" : "created_at";
  query = query.order(order, { ascending: false }).limit(48);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ components: data ?? [] });
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
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const verified = await verifyUploadedZip(supabase, ACTIVE_ZIP_BUCKET, parsed.data.zipPath);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const published = await publishComponent(supabase, {
    ...parsed.data,
    sellerId: profile.id,
    sizeBytes: verified.sizeBytes,
  });
  if (!published.ok) return NextResponse.json({ error: published.error }, { status: published.status });

  return NextResponse.json({ id: published.id, slug: published.slug });
});
