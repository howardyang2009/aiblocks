import { NextResponse } from "next/server";
import { withAuth } from "@/lib/identity/auth";
import { parseBody } from "@/lib/request";
import { setStar, type SetStarDb } from "@/lib/engagement/stars";
import { narrowDb } from "@/lib/db-port";
import { toResponse } from "@/lib/result";
import type { ApiError } from "@/lib/api-errors";

// POST /api/components/[id]/star — body { starred: boolean }.
export const POST = withAuth(async (req, { params, profile, supabase }) => {
  const body = await parseBody<{ starred?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  if (typeof body.starred !== "boolean") {
    return NextResponse.json({ error: "invalidBody" satisfies ApiError }, { status: 400 });
  }

  const result = await setStar(narrowDb<SetStarDb>(supabase), {
    componentId: params.id,
    userId: profile.id,
    starred: body.starred,
  });
  if (!result.ok) return toResponse(result);
  return NextResponse.json({ starred: result.starred, count: result.count });
});
