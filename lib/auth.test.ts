import { describe, it, expect, vi } from "vitest";
import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";
import type { Tables } from "@/types/database";

function profileRow(overrides: Partial<Tables<"profiles">> = {}): Tables<"profiles"> {
  return {
    avatar_url: null,
    bio: null,
    clerk_user_id: "clerk1",
    created_at: "",
    display_name: null,
    github_url: null,
    id: "profile1",
    stripe_account_id: null,
    stripe_onboarding_done: false,
    twitter_url: null,
    updated_at: "",
    username: "someone",
    website_url: null,
    ...overrides,
  };
}

const fakeReq = {} as NextRequest;

describe("withAuth", () => {
  it("401s a signed-out viewer without calling the handler", async () => {
    const handler = vi.fn();
    const wrapped = withAuth(handler, {
      getViewer: async () => ({ userId: null, profile: null }),
      createSupabase: () => ({}) as never,
    });

    const res = await wrapped(fakeReq, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in first." });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls the handler with the resolved profile, awaited params, and the fresh supabase client", async () => {
    const profile = profileRow();
    const supabase = { marker: "fake-db" } as never;
    const handler = vi.fn(async (_req: NextRequest, ctx) =>
      NextResponse.json({ profileId: ctx.profile.id, param: ctx.params.id, sameDb: ctx.supabase === supabase })
    );
    const wrapped = withAuth(handler, {
      getViewer: async () => ({ userId: profile.clerk_user_id, profile }),
      createSupabase: () => supabase,
    });

    const res = await wrapped(fakeReq, { params: Promise.resolve({ id: "comp1" }) });

    expect(await res.json()).toEqual({ profileId: profile.id, param: "comp1", sameDb: true });
  });
});
