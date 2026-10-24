// One-off for the Clerk production cutover: every Profile is keyed by a
// development-instance user id, and the production instance issues new ids.
// This script finds or creates each Profile's user in the production instance
// (matched by primary email) and prints the SQL that rewrites
// profiles.clerk_user_id. It never writes to Supabase: review the SQL and run
// it in the Supabase SQL editor before switching the Vercel keys, or the first
// sign-in lazily creates a duplicate, empty Profile.
//
//   npx tsx --env-file=.env.local scripts/remap-clerk-users.ts            # dry run
//   npx tsx --env-file=.env.local scripts/remap-clerk-users.ts --apply    # create users
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// CLERK_DEV_SECRET_KEY (sk_test_) and CLERK_PROD_SECRET_KEY (sk_live_, only
// required with --apply). Safe to re-run: users that already exist in the
// production instance are reused, not created again.
import { createClient } from "@supabase/supabase-js";

const CLERK_API = "https://api.clerk.com/v1";
const USER_ID = /^user_[A-Za-z0-9]+$/;

type ClerkUser = {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: { id: string; email_address: string }[];
  first_name: string | null;
  last_name: string | null;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function clerk<T>(secretKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Clerk ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

function primaryEmail(user: ClerkUser): string {
  const email =
    user.email_addresses.find((e) => e.id === user.primary_email_address_id) ?? user.email_addresses[0];
  if (!email) throw new Error(`${user.id} has no email address; remap it by hand`);
  return email.email_address;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const devKey = env("CLERK_DEV_SECRET_KEY");
  if (!devKey.startsWith("sk_test_")) throw new Error("CLERK_DEV_SECRET_KEY must be an sk_test_ key");
  // A dry run only reads, so it may point at the development instance to
  // rehearse the matching; --apply must target production.
  const prodKey = env("CLERK_PROD_SECRET_KEY");
  if (apply && !prodKey.startsWith("sk_live_")) throw new Error("--apply needs an sk_live_ CLERK_PROD_SECRET_KEY");

  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: profiles, error } = await supabase.from("profiles").select("clerk_user_id, username");
  if (error) throw error;

  const remaps: { oldId: string; newId: string; username: string }[] = [];
  for (const profile of profiles) {
    const oldId: string = profile.clerk_user_id;
    const devUser = await clerk<ClerkUser>(devKey, `/users/${oldId}`);
    const email = primaryEmail(devUser);

    const [existing] = await clerk<ClerkUser[]>(prodKey, `/users?email_address=${encodeURIComponent(email)}`);
    let newId = existing?.id;
    if (newId) {
      console.error(`${profile.username}: ${email} already in target instance as ${newId}`);
    } else if (apply) {
      const created = await clerk<ClerkUser>(prodKey, "/users", {
        method: "POST",
        body: JSON.stringify({
          email_address: [email],
          first_name: devUser.first_name ?? undefined,
          last_name: devUser.last_name ?? undefined,
          external_id: oldId,
          skip_password_requirement: true,
        }),
      });
      newId = created.id;
      console.error(`${profile.username}: created ${email} as ${newId}`);
    } else {
      console.error(`${profile.username}: [dry run] would create ${email}`);
      continue;
    }

    if (!USER_ID.test(oldId) || !USER_ID.test(newId)) throw new Error(`unexpected user id ${oldId} -> ${newId}`);
    if (oldId !== newId) remaps.push({ oldId, newId, username: profile.username });
  }

  console.error(`${remaps.length} of ${profiles.length} Profiles to remap`);
  if (remaps.length === 0) return;
  console.log("begin;");
  for (const { oldId, newId, username } of remaps) {
    console.log(`update profiles set clerk_user_id = '${newId}' where clerk_user_id = '${oldId}'; -- ${username}`);
  }
  console.log(`select count(*) as remapped from profiles where clerk_user_id in (${remaps.map((r) => `'${r.newId}'`).join(", ")}); -- expect ${remaps.length}`);
  console.log("commit;");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
