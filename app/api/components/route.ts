import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/auth";
import { slugify, parseList } from "@/lib/utils";
import { exceedsZipSizeLimit, COMPONENT_SUMMARY_COLS } from "@/lib/constants";
import { ACTIVE_ZIP_BUCKET } from "@/lib/server-constants";
import { parseBody } from "@/lib/request";

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
  const bucket = ACTIVE_ZIP_BUCKET;

  const body = await parseBody<{
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  }>(req);
  if (body instanceof NextResponse) return body;

  // ---- Validate core fields ----
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const readme = String(body.readme ?? "");
  const zipPath = String(body.zipPath ?? "");

  if (name.length < 3) {
    return NextResponse.json({ error: "Name must be at least 3 characters." }, { status: 400 });
  }
  if (description.length < 10) {
    return NextResponse.json({ error: "Add a short description (10+ characters)." }, { status: 400 });
  }
  if (!zipPath) {
    return NextResponse.json({ error: "Upload a zip before publishing." }, { status: 400 });
  }
  // The uploaded object must live under THIS seller's namespace.
  if (!zipPath.startsWith(`${profile.id}/`)) {
    return NextResponse.json({ error: "Upload path mismatch." }, { status: 403 });
  }

  // ---- Price: accept dollars, store integer cents ----
  const dollars = parseFloat(String(body.price ?? "0"));
  if (Number.isNaN(dollars) || dollars < 0) {
    return NextResponse.json({ error: "Price must be 0 or a positive number." }, { status: 400 });
  }
  const priceCents = Math.round(dollars * 100);

  const ecosystems = parseList(body.ecosystems);
  const tagNames = parseList(body.tags);

  // ---- Verify the uploaded object exists and read its real size ----
  const folder = zipPath.split("/")[0];
  const fileName = zipPath.split("/").slice(1).join("/");
  const { data: listed } = await supabase.storage.from(bucket).list(folder, { search: fileName });
  const obj = listed?.find((o) => o.name === fileName);
  if (!obj) {
    return NextResponse.json({ error: "Uploaded file not found. Try again." }, { status: 400 });
  }
  const zipSize = (obj as any).metadata?.size ?? null;
  if (typeof zipSize === "number" && exceedsZipSizeLimit(zipSize)) {
    // Clean up the oversized object so it doesn't linger.
    await supabase.storage.from(bucket).remove([zipPath]);
    return NextResponse.json({ error: "Zip exceeds the 10MB limit." }, { status: 413 });
  }

  // ---- Insert the component ----
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: component, error: insertErr } = await supabase
    .from("components")
    .insert({
      seller_id: profile.id,
      name,
      slug,
      description,
      readme,
      ecosystems,
      price_cents: priceCents,
      currency: "usd",
      zip_path: zipPath,
      zip_size_bytes: zipSize,
      status: "published",
    })
    .select("id, slug")
    .single();

  if (insertErr || !component) {
    return NextResponse.json({ error: insertErr?.message ?? "Could not publish." }, { status: 500 });
  }

  // ---- Normalize + link tags (free-form, deduped) ----
  if (tagNames.length > 0) {
    const { data: tagRows } = await supabase
      .from("tags")
      .upsert(
        tagNames.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (tagRows && tagRows.length > 0) {
      await supabase.from("component_tags").insert(
        tagRows.map(t => ({ component_id: component.id, tag_id: t.id }))
      );
    }
  }

  return NextResponse.json({ id: component.id, slug: component.slug });
});
