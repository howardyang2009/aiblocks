# AiBlocks

> An open marketplace for reusable AI components — prompts, skills, agents, MCP servers, CLAUDE.md configs, hooks, and more. Cross-ecosystem (Claude, GPT, Gemini, Deepseek), community-driven, with optional paid downloads.

This is the V1 MVP scaffold: Next.js (App Router) + Tailwind, Clerk auth, Supabase (Postgres + Storage), and Stripe Connect.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
#    then fill in real keys from Clerk, Supabase, and Stripe.
#    (The app will not run past the auth provider until these are set.)

# 3. Create the database
#    Open the Supabase SQL editor and run:
#      supabase/migrations/0001_init.sql
#    Then create a PRIVATE storage bucket named "component-zips".

# 4. Run it
npm run dev   # http://localhost:3000
```

> **Heads up:** Clerk requires valid keys to render. After `cp .env.example .env.local`, paste your real publishable + secret keys before `npm run dev` or `npm run build`.

---

## Project structure

```
app/
  (public)/        Home, Browse, Component detail, Seller profile, static pages
  (auth)/          Clerk sign-in / sign-up
  dashboard/       My Downloads, Publish, Stripe onboarding (login required)
  api/             Server routes (checkout, webhook, download paywall, star, tags)
components/         Reusable React UI (NOT the AI "components" — those are DB rows)
lib/               Integrations: supabase (client/server), stripe, clerk, utils
supabase/          migrations/0001_init.sql (the schema) + config
types/             database.ts (replace with generated types)
middleware.ts      Clerk route protection for /dashboard
```

## The security-critical path

`app/api/components/[id]/download/route.ts` is the **paywall**. It releases a
short-lived signed URL **only** after confirming the user is entitled
(free → any signed-in user; paid → a `downloads` row that exists only after a
succeeded purchase). The zip bucket must stay private. Review this route, and
the Stripe webhook, carefully before launch — these are the Augmentation /
Human-Led items from the delegation plan.

## Before launch (Diligence checklist)

- [ ] Enable Row Level Security on every table and write policies (see schema notes)
- [ ] Wire Clerk → Supabase JWT so RLS can read `clerk_user_id`
- [ ] Verify the Stripe webhook signature path end-to-end with a test purchase
- [ ] Confirm the zip bucket is private and only reachable via signed URLs
- [ ] Replace placeholder Terms / Privacy with reviewed legal copy
- [ ] Generate real DB types: `npx supabase gen types typescript > types/database.ts`

## Stack

Next.js 14 · Tailwind CSS · Clerk · Supabase · Stripe Connect · react-markdown · Vercel
