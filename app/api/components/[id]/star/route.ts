import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

// Toggle a star for the current user. The star_count trigger keeps
// components.star_count in sync automatically.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to star." }, { status: 401 });

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("clerk_user_id", userId).single();
  if (!profile) return NextResponse.json({ error: "No profile." }, { status: 403 });

  // Is it already starred?
  const { data: existing } = await supabase
    .from("stars").select("user_id").eq("user_id", profile.id).eq("component_id", params.id).maybeSingle();

  if (existing) {
    await supabase.from("stars").delete().eq("user_id", profile.id).eq("component_id", params.id);
    return NextResponse.json({ starred: false });
  }
  await supabase.from("stars").insert({ user_id: profile.id, component_id: params.id });
  return NextResponse.json({ starred: true });
}
