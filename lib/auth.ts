import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/resolve-viewer";
import type { Tables } from "@/types/database";

export type AuthContext = {
  params: Record<string, string>;
  profile: Tables<"profiles">;
  supabase: ReturnType<typeof createServiceClient>;
};

export type WithAuthDeps = {
  getViewer: () => Promise<Viewer>;
  createSupabase: () => ReturnType<typeof createServiceClient>;
};

// The real default is loaded lazily (dynamic import, not a static one) so
// importing this module — e.g. from a test that always supplies fakes —
// never pulls in lib/viewer.ts's React.cache() wiring, which only works
// inside Next's bundler and throws in a plain Node/test environment.
async function realDeps(): Promise<WithAuthDeps> {
  const { getViewer } = await import("@/lib/viewer");
  return { getViewer, createSupabase: createServiceClient };
}

// Wraps an API route handler with auth + profile bootstrap.
// The API-route adapter over getViewer: 401s on a signed-out viewer instead
// of letting the handler run, so handlers only ever see a real profile.
//
// `deps` defaults to the real Clerk/Supabase-backed implementations; tests
// pass fakes here to drive the 401 short-circuit and the handler-wiring
// without touching Clerk or Supabase at all.
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>,
  deps?: WithAuthDeps
) {
  return async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { getViewer, createSupabase } = deps ?? (await realDeps());
    const { profile } = await getViewer();
    if (!profile) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    const supabase = createSupabase();
    return await handler(req, { params: await params, profile, supabase });
  };
}
