import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// Toggle a star for the current user. The star_count trigger keeps
// components.star_count in sync automatically.
export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const { data: existing } = await supabase
    .from("stars").select("user_id").eq("user_id", profile.id).eq("component_id", params.id).maybeSingle();

  if (existing) {
    await supabase.from("stars").delete().eq("user_id", profile.id).eq("component_id", params.id);
    return NextResponse.json({ starred: false });
  }
  await supabase.from("stars").insert({ user_id: profile.id, component_id: params.id });
  return NextResponse.json({ starred: true });
});
