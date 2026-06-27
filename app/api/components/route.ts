import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/components?q=&tag=&sort=  — browse + search.
// Uses Postgres full-text search on the generated search_tsv column.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") ?? "newest";

  const supabase = createServiceClient();
  let query = supabase
    .from("components")
    .select("id, name, description, ecosystems, price_cents, currency, star_count, download_count")
    .eq("status", "published");

  if (q) query = query.textSearch("search_tsv", q, { type: "websearch" });

  const order =
    sort === "downloads" ? "download_count" : sort === "stars" ? "star_count" : "created_at";
  query = query.order(order, { ascending: false }).limit(48);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ components: data ?? [] });
}

// POST /api/components — create a listing.
// TODO (Augmentation): validate input, handle the zip upload to Storage,
// normalize tags, insert component_tags. Keep zip <= 10MB.
export async function POST() {
  return NextResponse.json({ error: "Not implemented yet." }, { status: 501 });
}
