import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import type { Tables } from "@/types/database";

export type AuthContext = {
  params: Record<string, string>;
  profile: Tables<"profiles">;
  supabase: ReturnType<typeof createServiceClient>;
};

// Wraps an API route handler with auth + profile bootstrap.
// The API-route adapter over getViewer: 401s on a signed-out viewer instead
// of letting the handler run, so handlers only ever see a real profile.
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, { params }: { params: Record<string, string> }) => {
    const { profile } = await getViewer();
    if (!profile) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    const supabase = createServiceClient();
    return await handler(req, { params, profile, supabase });
  };
}
