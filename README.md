# [AiBlocks](https://aiblocks-six.vercel.app/)

> An open marketplace for reusable AI components — prompts, skills, subagents, MCP
> servers, CLAUDE.md configs, hooks, slash commands, Claude plugins, and LLMs.
> Cross-ecosystem (Claude, GPT, Gemini, Deepseek), community-driven, with optional
> paid downloads. The home page also federates search out to the wider web (GitHub,
> Brave, Google, and a dozen skill/plugin directories) for components not yet in
> the catalog.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
#    then fill in real keys from Clerk, Supabase, and Stripe.
#    (The app will not run past the auth provider until these are set.)
#    External search adapter keys are optional — each adapter disables
#    itself cleanly if its key is missing (see .env.example).

# 3. Create the database
#    Open the Supabase SQL editor and run the migrations in order:
#      supabase/migrations/0001_init.sql
#      supabase/migrations/0002_rls.sql
#      supabase/migrations/0003_withdrawal_consent.sql
#      supabase/migrations/0004_review_replies.sql
#      supabase/migrations/0005_rename_agent_tag_to_subagent.sql
#    Then create a PRIVATE storage bucket named "component-zips".

# 4. Run it
npm run dev   # http://localhost:3000

# 5. Run the test suite (business logic only — see Testing below)
npm test
```

> **Heads up:** Clerk requires valid keys to render. After `cp .env.example .env.local`, paste your real publishable + secret keys before `npm run dev` or `npm run build`.

---

## Project structure

```
app/
  (public)/        Home (catalog + external search hero), Browse, /search
                    (combined catalog + external results), Component detail,
                    Seller profile, static pages
  (auth)/          Clerk sign-in / sign-up
  dashboard/       My Downloads, Publish, Stripe onboarding (login required)
  api/             Server routes — checkout, Stripe webhook, download paywall,
                   comments, reviews, seller replies, stars, tags
components/        Reusable React UI (NOT the AI "components" — those are DB rows)
                     external-search/   search hero form, component-type radio
                                        pills, external result cards/list
lib/               Business logic + integrations, one module per concept:
                     entitlements.ts, purchases.ts, publish.ts    Entitlement / Purchase / publishing
                     comments.ts, reviews.ts,                     Comment / Review / Seller reply / Star
                       replies.ts, stars.ts
                     components.ts, validation.ts,                shared seams: published-component gate,
                       db-port.ts                                  body validation, narrow-port casting
                     auth.ts, viewer.ts, clerk.ts                  identity: route auth, Server Component
                                                                    viewer, Clerk profile bootstrap
                     search-query.ts                               component-type <-> catalog-tag mapping
                     external-search/                              federated web search: per-source adapters
                                                                    (GitHub, Brave, Google, Smithery,
                                                                    Hugging Face, SkillsMP, and more under
                                                                    adapters/), config + orchestrator
                     supabase/, stripe.ts,                         client factories + shared constants
                       constants.ts, utils.ts
                   *.test.ts sits next to the module it tests — see Testing below
supabase/          migrations/0001-0005_*.sql (the schema, in order) + config
types/             database.ts (generated — regenerate after schema changes)
docs/adr/          Architecture decisions worth preserving (the why, not just the what)
docs/superpowers/  Design specs and plans for larger features (external search, e2e testing)
e2e/               Playwright end-to-end tests — see e2e/README.md
CONTEXT.md         Domain glossary — the vocabulary this codebase uses for its own concepts
proxy.ts           Clerk route protection for /dashboard
```

## Testing

```bash
npm test              # unit/business-logic tests, run once
npm run test:watch
npm run test:e2e       # Playwright end-to-end, headless
npm run test:e2e:ui    # Playwright interactive UI mode
```

[Vitest](https://vitest.dev) covers the business-logic layer in `lib/` and the pure
`buildComponentView` function in `app/(public)/components/[id]/view-model.ts`. Each
tested function takes its dependencies as a narrow, structurally-typed "port" (see
`lib/db-port.ts`), so tests pass in plain object literals instead of mocking the real
Supabase or Stripe clients.

[Playwright](https://playwright.dev) drives a real browser against the app for the
signed-out browse/search/filter flow and a full signed-in publish → download → star →
comment journey. See `e2e/README.md` for setup (local Supabase, a Clerk test user,
`.env.test.local`) and what's still deliberately deferred (paid checkout, a second
reviewer identity). Runs in CI on every push/PR to `main` (`.github/workflows/ci.yml`).

## The security-critical path

`app/api/components/[id]/download/route.ts` is the **paywall**. It releases a
short-lived signed URL **only** after confirming the user is entitled
(free → any signed-in user; paid → a `downloads` row that exists only after a
succeeded purchase). The zip bucket must stay private. Review this route, and
the Stripe webhook, carefully before launch — these are the Augmentation /
Human-Led items from the delegation plan.

## Before launch (Diligence checklist)

- [x] Enable Row Level Security on every table and write policies (see schema notes)
- [ ] Wire Clerk → Supabase JWT so RLS can read `clerk_user_id`
- [x] Verify the Stripe webhook signature path end-to-end with a test purchase
- [x] Confirm the zip bucket is private and only reachable via signed URLs
- [x] Replace placeholder Terms / Privacy with reviewed legal copy
- [x] Generate real DB types: `npx supabase gen types typescript --project-id mvuzsjhqqggcccydflkv > types/database.ts`
- [x] Unit tests for the business-logic layer (`npm test`)
- [x] Route-handler / end-to-end test coverage (Playwright — see `e2e/README.md`;
      paid checkout and a second reviewer identity are still deferred)

## Stack

Next.js 16 · Tailwind CSS · Clerk · Supabase · Stripe Connect · react-markdown ·
Vitest · Playwright · Vercel
