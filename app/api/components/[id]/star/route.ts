import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { toggleStar, type ToggleStarDb } from "@/lib/stars";
import { narrowDb } from "@/lib/db-port";

export const POST = withAuth(async (_req, { params, profile, supabase }) => {
  const result = await toggleStar(narrowDb<ToggleStarDb>(supabase), { componentId: params.id, userId: profile.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ starred: result.starred });
});
