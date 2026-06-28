import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";

// Toggle a star for the current user. The star_count trigger keeps
// components.star_count in sync automatically.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Sign in to star." }, { status: 401 });

  // Bootstrap the profile on first action.
  const profile = await ensureProfile();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("stars").select("user_id").eq("user_id", profile.id).eq("component_id", params.id).maybeSingle();

  if (existing) {
    await supabase.from("stars").delete().eq("user_id", profile.id).eq("component_id", params.id);
    return NextResponse.json({ starred: false });
  }
  await supabase.from("stars").insert({ user_id: profile.id, component_id: params.id });
  return NextResponse.json({ starred: true });
}
