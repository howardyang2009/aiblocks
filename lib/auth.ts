import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureProfile, UnauthenticatedError } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AuthContext = {
  params: Record<string, string>;
  profile: Tables<"profiles">;
  supabase: ReturnType<typeof createServiceClient>;
};

// Wraps an API route handler with auth + profile bootstrap.
// Calls auth() exactly once (here), returns 401 if not signed in, and
// passes { params, profile, supabase } to the handler.
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, { params }: { params: Record<string, string> }) => {
    try {
      const { userId } = auth();
      if (!userId) throw new UnauthenticatedError();
      const supabase = createServiceClient();
      const profile = await ensureProfile(userId, supabase);
      return await handler(req, { params, profile, supabase });
    } catch (err) {
      if (err instanceof UnauthenticatedError) {
        return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      }
      throw err;
    }
  };
}
