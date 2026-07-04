import { describe, it, expect, vi } from "vitest";
import { ensureProfile, type EnsureProfileDb, type ClerkUserLike } from "@/lib/clerk";
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

function fakeDb(opts: {
  existingByClerkId?: Tables<"profiles"> | null;
  takenCount?: number;
  insertResult?: { data: Tables<"profiles"> | null; error: { message: string } | null };
  raceFallback?: Tables<"profiles"> | null;
}) {
  let clerkIdCalls = 0;
  let usernameCalls = 0;
  const insert = vi.fn(
    (_row: { clerk_user_id: string; username: string; display_name: string; avatar_url: string | null }) => ({
      select: () => ({
        single: async () => opts.insertResult ?? { data: profileRow(), error: null },
      }),
    })
  );
  const db = {
    from: () => ({
      select: () => ({
        eq: (column: string) => ({
          maybeSingle: async () => {
            if (column === "clerk_user_id") {
              clerkIdCalls++;
              return { data: clerkIdCalls === 1 ? opts.existingByClerkId ?? null : opts.raceFallback ?? null };
            }
            usernameCalls++;
            const taken = usernameCalls <= (opts.takenCount ?? 0);
            return { data: taken ? profileRow({ id: "someone-else" }) : null };
          },
        }),
      }),
      insert,
    }),
  } as unknown as EnsureProfileDb;
  return { db, insert };
}

const clerkUser = (overrides: Partial<NonNullable<ClerkUserLike>> = {}): ClerkUserLike => ({
  username: null,
  emailAddresses: [],
  firstName: null,
  lastName: null,
  imageUrl: null,
  ...overrides,
});

describe("ensureProfile", () => {
  it("returns the existing profile without deriving anything from Clerk", async () => {
    const existing = profileRow({ id: "existing1" });
    const { db } = fakeDb({ existingByClerkId: existing });
    const getClerkUser = vi.fn(async () => clerkUser());

    const result = await ensureProfile("clerk1", db, getClerkUser);

    expect(result).toEqual(existing);
    expect(getClerkUser).not.toHaveBeenCalled();
  });

  it("derives the username from the Clerk user's username", async () => {
    const { db, insert } = fakeDb({ existingByClerkId: null });
    await ensureProfile("clerk1", db, async () => clerkUser({ username: "Alice", firstName: "Alice", lastName: "A" }));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ username: "alice", display_name: "Alice A" })
    );
  });

  it("falls back to the email local part when Clerk has no username", async () => {
    const { db, insert } = fakeDb({ existingByClerkId: null });
    await ensureProfile(
      "clerk1",
      db,
      async () => clerkUser({ emailAddresses: [{ emailAddress: "bob@example.com" }] })
    );

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ username: "bob" }));
  });

  it("falls back to a generic username when Clerk has neither a username nor an email", async () => {
    const { db, insert } = fakeDb({ existingByClerkId: null });
    await ensureProfile("clerk1", db, async () => clerkUser());

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ username: "user", display_name: "user" }));
  });

  it("retries with a random suffix when the base username is already taken", async () => {
    const { db, insert } = fakeDb({ existingByClerkId: null, takenCount: 2 });
    await ensureProfile("clerk1", db, async () => clerkUser({ username: "alice" }));

    const insertedUsername = insert.mock.calls[0][0].username as string;
    expect(insertedUsername).toMatch(/^alice-/);
  });

  it("returns the concurrently-created profile when the insert fails (race)", async () => {
    const racedRow = profileRow({ id: "raced-in" });
    const { db } = fakeDb({
      existingByClerkId: null,
      insertResult: { data: null, error: { message: "unique violation" } },
      raceFallback: racedRow,
    });

    const result = await ensureProfile("clerk1", db, async () => clerkUser());

    expect(result).toEqual(racedRow);
  });

  it("rethrows when the insert fails and no concurrently-created row is found", async () => {
    const { db } = fakeDb({
      existingByClerkId: null,
      insertResult: { data: null, error: { message: "db down" } },
      raceFallback: null,
    });

    await expect(ensureProfile("clerk1", db, async () => clerkUser())).rejects.toEqual({ message: "db down" });
  });
});
