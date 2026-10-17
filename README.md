# AiBlocks

Open marketplace for reusable AI components: skills, subagents, prompts, MCP servers, hooks, slash commands, CLAUDE.md files, Claude plugins, and LLMs. Free or paid downloads via Stripe Connect.

Live: https://aiblocks.rheinwegde.de · A product by [RheinWeg](https://rheinwegde.de/)

## Setup

Needs Node.js 24 and accounts for Clerk, Supabase, and Stripe.

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # http://localhost:3000
```

Database: run `supabase/migrations/*.sql` in order in the Supabase SQL editor, then create a private Storage bucket `component-zips`.

## Test

```bash
npm test           # Vitest unit tests
npm run test:e2e   # Playwright, see e2e/README.md
```

## Deploy

Vercel deploys `main` to production. Set the variables from `.env.example`, with `NEXT_PUBLIC_APP_URL` set to the public domain. Point a Stripe webhook for `checkout.session.completed` at `https://<domain>/api/webhooks/stripe`.

## License

[MIT](LICENSE)
