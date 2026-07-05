# E2E tests

Browser end-to-end coverage via [Playwright](https://playwright.dev), driving a real
Chromium browser against the app running with `NODE_ENV=test` (so it loads
`.env.test.local`, never your real `.env.local`).

## What's covered

- **`browse.spec.ts`** — signed out: home → browse → search/filter/sort → a component's
  detail page. Seeds its own component directly in Supabase (bypassing the UI — the
  publish flow itself is covered below), so it never depends on Clerk.
- **`publish-and-engage.spec.ts`** — signed in, one continuous journey run as
  `test.describe.serial()` (each step depends on the previous step's output):
  1. Publish a free component through the real UI, including a real zip upload to
     Supabase Storage.
  2. Download it and confirm the paywall (`app/api/components/[id]/download/route.ts`)
     grants access and records the entitlement.
  3. Star it.
  4. Comment on it.
  5. Confirm the review form is correctly hidden — sellers can't review their own
     components (see `CONTEXT.md`).

**Not covered yet** (deliberately deferred):
- Paid checkout + the Stripe webhook — needs the Stripe CLI forwarding events to
  localhost. Separate follow-up.
- Leaving an actual verified review as a *different* buyer — needs a second Clerk
  test identity. Also a follow-up.

## CI

Runs on every push/PR to `main` via `.github/workflows/ci.yml`. The job spins up a
throwaway local Supabase stack with the Supabase CLI (`supabase start` +
`supabase db reset` — same migrations/seed as local dev, Docker is already available
on the runner) and writes a `.env.test.local` from repo secrets plus that run's
freshly-printed Supabase keys. Requires these repo secrets to be set once
(Settings → Secrets and variables → Actions):
- `E2E_CLERK_PUBLISHABLE_KEY`
- `E2E_CLERK_SECRET_KEY`
- `E2E_CLERK_TEST_USER_EMAIL`

(the same test-mode Clerk keys and test user email used locally — see Prerequisites
above).

See `docs/superpowers/specs/2026-07-04-e2e-testing-design.md` for the full design.

## Prerequisites (one-time)

1. **Local Supabase.** This repo already has `supabase/config.toml` and migrations. Install
   the [Supabase CLI](https://supabase.com/docs/guides/cli) if you haven't, then:
   ```bash
   supabase start
   ```
   Note the `API URL`, `anon key`, and `service_role key` it prints — you'll need them below.

2. **A Clerk test user.** In your Clerk dashboard (the same dev instance your
   `.env.local` already points at): Users → Create user → any email address.
   No password needed — `auth.setup.ts` signs in via `clerk.signIn({ page,
   emailAddress })`, which mints a sign-in ticket through Clerk's Backend API
   rather than driving a first-factor flow. (An earlier version of this setup
   tried password sign-in; that hit `needs_client_trust` — a device-trust
   check on password auth from an unrecognized client that the bot-detection
   testing token doesn't cover. Email-based sign-in sidesteps it entirely.)

3. **Copy the env file:**
   ```bash
   cp .env.test.local.example .env.test.local
   ```
   Fill in: your Clerk test-mode keys, the test user's email, and the local
   Supabase URL/keys — copy `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`
   straight from step 1's `supabase start` output (or `supabase status` if it's
   already running). These vary per machine/CLI version — use the JWT-style
   `ANON_KEY`/`SERVICE_ROLE_KEY`, not the newer `sb_publishable_`/`sb_secret_` ones.

## Running

Before every run, get a clean schema (the suite does NOT do this for you — it never
discards data you didn't ask it to):
```bash
supabase db reset
```

Then:
```bash
npm run test:e2e        # headless, once
npm run test:e2e:ui     # Playwright's interactive UI mode — start here if debugging
```

Playwright starts the app itself (`npm run dev:test`) and stops it after the run. If
port 3000 is already taken (e.g. by a regular `npm run dev`), the suite fails fast
rather than silently testing against the wrong server — stop the other process first.

## How auth works

`auth.setup.ts` is a Playwright **setup project** that runs once before the `signed-in`
project: it drives a real Clerk sign-in with `@clerk/testing`'s email-based helper
(a Backend API sign-in ticket, not password/first-factor), asserts the app lands
authenticated, and saves the session to `e2e/.auth/user.json` (gitignored). Every spec
in the `signed-in` project reuses that saved session instead of re-driving sign-in —
so sign-in is exercised for real exactly once per run.

`browse.spec.ts` runs under a separate `signed-out` project with no dependency on
`setup`, so it's unaffected if Clerk sign-in has a problem.

## Troubleshooting

- **`permission denied for table ...`** from a seed/service-role call: `supabase/seed.sql`
  didn't run. It grants `anon`/`authenticated`/`service_role` their baseline table
  privileges — the hosted Supabase project has these from when it was provisioned, but
  a fresh local `supabase start` doesn't replicate them (nothing to do with RLS, which
  still applies on top). Run `supabase db reset` to reapply it.
- **`502` / "invalid response from upstream" hitting Supabase Storage right after
  `supabase db reset`:** Kong's internal DNS cache goes stale when `db reset` restarts
  the storage container (and others) but not Kong itself, so Kong keeps routing to the
  old container IP. Fix: `docker restart supabase_kong_<project-id>` (project id is
  `aiblocks`, from `supabase/config.toml`), then retry.
