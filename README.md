<div align="center">

<img src="app/icon.svg" alt="AiBlocks logo" width="64" height="64" />

# AiBlocks

**Open marketplace for reusable AI components**

[Live site](https://aiblocks.rheinwegde.de) · [Releases](https://github.com/howardyang2009/aiblocks/releases) · [Domain glossary](CONTEXT.md) · [E2E guide](e2e/README.md)

![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![License: MIT](https://img.shields.io/badge/License-MIT-1d6a9e)

A product by [RheinWeg](https://rheinwegde.de/)

</div>

---

## Overview

AiBlocks is a marketplace where sellers publish reusable AI components and buyers download them, free or paid. A component is any self-contained building block for AI-assisted work:

| Type | Examples |
|------|----------|
| Skill | Claude skills, packaged prompt workflows |
| Subagent | Task-specific agent definitions |
| Prompt | Reusable system and task prompts |
| MCP server | Model Context Protocol servers |
| Hook | Agent lifecycle hooks |
| Slash command | `/command` definitions |
| CLAUDE.md | Project and user instruction files |
| Claude plugin | Bundled plugins |
| LLM | Model cards and fine-tunes |

The catalog is cross-ecosystem (Claude, GPT, Gemini, DeepSeek). When a component is not in the catalog yet, the home page search fans out to the wider web: GitHub, Brave, Google, Hugging Face, Smithery, and several skill and plugin directories.

## Features

- **Catalog and browse.** Search and filter components by type and tag. Each component has a detail page with Markdown docs.
- **Federated web search.** Fourteen source adapters run in parallel. Each adapter disables itself cleanly when its API key is missing.
- **Paid downloads with Stripe Connect.** Buyers pay through Stripe Checkout. Funds go directly to the seller's connected account. The EU 14-day withdrawal waiver is enforced in the UI, the API, and Stripe's consent step.
- **Paywalled delivery.** Component zips live in a private Supabase Storage bucket. The download route releases a short-lived signed URL only after it confirms an entitlement.
- **Community.** Threaded comments, verified-buyer reviews with seller replies, and stars.
- **Dashboard.** Sellers publish and edit components and connect a Stripe account. Buyers find everything they acquired under My downloads.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Auth | [Clerk](https://clerk.com) |
| Database and storage | [Supabase](https://supabase.com) (Postgres with Row Level Security, Storage) |
| Payments | [Stripe](https://stripe.com) Checkout and Connect |
| Content | react-markdown, remark-gfm |
| Testing | [Vitest](https://vitest.dev), [Playwright](https://playwright.dev) |
| Hosting | [Vercel](https://vercel.com), DNS on Cloudflare |

## Getting started

### Prerequisites

- Node.js 24 (the version CI uses)
- A Clerk application, a Supabase project, and a Stripe account in test mode

### 1. Install

```bash
git clone https://github.com/howardyang2009/aiblocks.git
cd aiblocks
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Clerk needs valid keys before `npm run dev` or `npm run build` will render anything.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Yes | Clerk authentication |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Clerk routes (`/sign-in`, `/sign-up`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Bypasses RLS, never expose it to the browser |
| `SUPABASE_ZIP_BUCKET` | Yes | Private bucket for component zips (default `component-zips`) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Yes | Verifies Stripe webhook signatures |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL, used for Checkout and Connect redirects |
| `GITHUB_TOKEN`, `SKILLSMP_API_KEY`, `HUGGINGFACE_API_TOKEN` | No | Raise rate limits for those search adapters |
| `SMITHERY_API_KEY`, `BRAVE_SEARCH_API_KEY` | No | Enable the Smithery and Brave adapters |
| `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_PROJECT_ID`, `GOOGLE_SEARCH_ENGINE_ID` | No | Enable the Google fallback (all three needed) |

### 3. Set up the database

In the Supabase SQL editor, run the migrations in `supabase/migrations/` in order (`0001_init.sql` through `0006_rename_model_tag_to_llm.sql`). Then create a **private** Storage bucket named `component-zips`.

After a schema change, regenerate the types:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

### 4. Run

```bash
npm run dev     # http://localhost:3000
```

To test payments locally, forward Stripe events to the webhook route:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm test` | Run the Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run the Playwright end-to-end tests, headless |
| `npm run test:e2e:ui` | Run Playwright in interactive UI mode |

## Project structure

```
app/
  (public)/          Home, browse, search, component detail, seller profiles, legal pages
  (auth)/            Clerk sign-in and sign-up
  dashboard/         Downloads, publishing, Stripe onboarding (sign-in required)
  api/               Checkout, Stripe webhook, download paywall, comments, reviews, stars, tags
components/          React UI (the marketplace's AI "components" are database rows, not these)
lib/
  identity/          Route auth, page viewer, Clerk profile bootstrap
  commerce/          Components, purchases, entitlements, publishing, Stripe
  engagement/        Comments, reviews, seller replies, stars
  external-search/   Federated web search: adapters, orchestrator, query mapping
  (root)             Shared infrastructure: db ports, validation, results, Supabase clients
supabase/            SQL migrations and local config
types/               Generated database types
e2e/                 Playwright tests
docs/adr/            Architecture decision records
CONTEXT.md           Domain glossary
proxy.ts             Clerk route protection for /dashboard
```

Business logic lives in `lib/`, grouped by domain, with each module's `*.test.ts` next to it. [CONTEXT.md](CONTEXT.md) defines the vocabulary the code uses: Profile, Viewer, Component, Entitlement, Purchase, and more.

## Architecture notes

### Purchase flow

1. The buyer accepts the withdrawal waiver and starts Stripe Checkout. A `pending` Purchase is recorded.
2. Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`. The route verifies the signature.
3. The Purchase becomes `succeeded` and the buyer gets an Entitlement.
4. The download route checks the Entitlement and returns a short-lived signed URL to the zip.

A failed database write makes the webhook return 5xx, so Stripe retries the delivery.

### Security-critical paths

- **`app/api/components/[id]/download/route.ts`** is the paywall. Free components need any signed-in user. Paid components need a download row that only exists after a succeeded Purchase.
- **`app/api/webhooks/stripe/route.ts`** is the only place a Purchase can become `succeeded`. It rejects any request without a valid Stripe signature.
- Row Level Security is enabled on every table as defense in depth (see [ADR 0001](docs/adr/0001-rls-defense-in-depth.md)).

Review both routes carefully when changing commerce code.

### Testing approach

Every tested function in `lib/` takes its dependencies as a narrow, structurally typed port (`lib/db-port.ts`). Tests pass plain object literals instead of mocking the Supabase or Stripe clients.

Playwright drives a real browser through the signed-out browse and search flow, and a signed-in journey covering publish, download, star, and comment. Paid checkout is not covered by E2E yet. See [e2e/README.md](e2e/README.md) for local setup.

CI (`.github/workflows/ci.yml`) runs the unit tests and the E2E suite, against a local Supabase, on every push and pull request to `main`.

## Deployment

Production runs on Vercel at [aiblocks.rheinwegde.de](https://aiblocks.rheinwegde.de). Every merge to `main` triggers a production deploy. Pull requests get preview deployments.

When you deploy a new environment:

1. Set every required variable from the table above in Vercel. Set `NEXT_PUBLIC_APP_URL` to the public domain. `NEXT_PUBLIC_*` variables are inlined at build time, so redeploy after you change one.
2. Add a Stripe webhook destination for `https://<domain>/api/webhooks/stripe` that listens to `checkout.session.completed`. Stripe does not follow redirects, so use the final domain.
3. Add the domain to Clerk's allowed origins.

## Roadmap

- [ ] Pass Clerk JWTs to Supabase so RLS policies can read `clerk_user_id`
- [ ] Move Clerk to a production instance
- [ ] E2E coverage for paid checkout and a second reviewer identity

## License

[MIT](LICENSE) © 2026 Han Yang
