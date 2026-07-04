# E2E testing — design

Status: approved
Date: 2026-07-04

## Problem

`README.md` flags this gap directly: unit tests cover `lib/` business logic, but
"there's no route-handler, browser, or end-to-end coverage yet — routes are thin
wrappers around the tested `lib/` functions, but the HTTP layer itself hasn't been
exercised." This is an unchecked item on the launch checklist.

## Goal

Full browser end-to-end coverage of the marketplace's core value loop: a visitor
browses without an account, a seller signs in and publishes a free component, a
buyer downloads it through the paywall, and engages with it (star, comment, review).

Explicitly out of scope for this pass:
- Paid checkout + Stripe webhook (needs the Stripe CLI forwarding events to
  localhost — separate follow-up once this harness is proven out).
- CI wiring (GitHub Actions). Local-only for now.

## Tooling

- **Playwright** (`@playwright/test`) — standard for Next.js apps, first-class
  auth-state reuse via `storageState`, built-in `webServer` orchestration.
- **`@clerk/testing`** — Clerk's official Playwright helper, bypasses Clerk's
  bot-detection challenge during automated sign-in so a real login can be driven
  by a script instead of a human.

## Auth strategy

One dedicated Clerk test-mode user, created once, by hand, in the Clerk dashboard.
Email lives in `.env.test.local` as `CLERK_TEST_USER_EMAIL`.

**Revised during implementation:** password-strategy sign-in (the original plan)
returned `needs_client_trust` — a device-trust check on password auth from an
unrecognized client that the bot-detection testing token doesn't cover. Switched to
`@clerk/testing`'s email-based helper (`clerk.signIn({ page, emailAddress })`), which
mints a sign-in ticket via Clerk's Backend API instead of driving a first-factor flow —
sidesteps the issue entirely and needs no password.

A Playwright **setup project** (`e2e/auth.setup.ts`) drives the real sign-in page,
asserts the app lands in an authenticated state, and saves the session to
`e2e/.auth/user.json` (gitignored). This setup project *is* the sign-in test —
not a shortcut around it. Every spec that needs to be signed in declares a
dependency on this project in `playwright.config.ts` and reuses the saved state,
so sign-in is exercised for real exactly once per run, not re-driven per spec.

## Data lifecycle

Tests run against **local Supabase** (`supabase start` — already configured via
`supabase/config.toml` and migrations `0001`–`0004`). A Playwright `globalSetup`
ensures the private `component-zips` storage bucket exists (idempotent create via
the service-role client), since bucket creation isn't part of the SQL migrations.

Resetting the schema (`supabase db reset`) is a manual step documented in
`e2e/README.md`, run before a test session — not automated, so a test run never
silently discards data you didn't expect it to.

## Environment

Next.js has a built-in third environment beyond development/production: when
`NODE_ENV=test`, it loads `.env.test` / `.env.test.local` instead of
`.env.local`. Playwright's `webServer.command` starts the app as
`NODE_ENV=test next dev`, so the e2e suite never touches real dev credentials —
it reads `.env.test.local`, pointed at local Supabase and Clerk test-mode keys.
`STRIPE_SECRET_KEY` gets a dummy `sk_test_` value; `getStripe()` only throws if
actually called, and nothing in this pass's flows calls it.

## Structure

```
playwright.config.ts                 # webServer: NODE_ENV=test next dev
                                      # projects: "setup" (auth.setup.ts) ->
                                      #   dependency for all other projects
e2e/
  global-setup.ts                    # ensures the zip bucket exists
  auth.setup.ts                      # real Clerk sign-in, saves storage state
  browse.spec.ts                     # signed out: home -> browse -> search/
                                      #   filter/sort -> component detail page
  publish-and-engage.spec.ts         # signed in, test.describe.serial():
                                      #   1. publish a free component (real zip
                                      #      upload through Supabase Storage)
                                      #   2. download it -> paywall grants access
                                      #   3. star it
                                      #   4. comment + review it
  fixtures/test-component.zip        # tiny real zip, checked into the repo
  README.md                          # prerequisites + how to run
.env.test.local.example              # documents required vars; real file gitignored
```

`publish-and-engage.spec.ts` is one serial chain, not three independent specs that
each republish a component, because steps 2-4 genuinely depend on step 1's
output (the same component row) — that's the real user journey. `test.describe.serial`
still reports each step's pass/fail individually in the Playwright report.

## Error handling / flakiness notes

- File upload goes through Supabase Storage directly from the browser (signed
  upload URL) exactly as production does — no mocking of that step.
- Assertions wait on visible UI state (e.g., "... is live" confirmation, the
  download button's post-download state) rather than fixed timeouts.
- Component names include a timestamp so repeated runs against a non-reset
  database don't collide on uniqueness assumptions (there are none at the DB
  level, but slugs should stay readably distinct in Supabase Studio while
  debugging).

## Follow-ups (explicitly not this pass)

- Paid purchase + Stripe webhook e2e coverage.
- GitHub Actions workflow running this suite in CI.
