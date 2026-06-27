import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/tags?q=  — tag autocomplete suggestions.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const supabase = createServiceClient();
  let query = supabase.from("tags").select("name").order("name").limit(10);
  if (q) query = query.ilike("name", `${q}%`);

  const { data } = await query;
  return NextResponse.json({ tags: (data ?? []).map((t) => t.name) });
}
