import { describe, it, expect, vi } from "vitest";
import { resolveViewer } from "@/lib/resolve-viewer";
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

describe("resolveViewer", () => {
  it("returns a null viewer for a signed-out visitor, without bootstrapping a profile", async () => {
    const ensureProfile = vi.fn();
    const result = await resolveViewer({
      getAuth: async () => ({ userId: null }),
      ensureProfile,
    });

    expect(result).toEqual({ userId: null, profile: null });
    expect(ensureProfile).not.toHaveBeenCalled();
  });

  it("resolves the signed-in viewer's profile", async () => {
    const profile = profileRow({ clerk_user_id: "clerk1" });
    const result = await resolveViewer({
      getAuth: async () => ({ userId: "clerk1" }),
      ensureProfile: async (userId) => {
        expect(userId).toBe("clerk1");
        return profile;
      },
    });

    expect(result).toEqual({ userId: "clerk1", profile });
  });
});
