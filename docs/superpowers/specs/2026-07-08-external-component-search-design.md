# External component search — design

Status: approved
Date: 2026-07-08

## Problem

aiblocks' own catalog only contains components sellers have published here. A
visitor looking for "an MCP server for Postgres" or "a skill for PDF extraction"
has no way to discover components that exist elsewhere — on GitHub, Hugging Face,
or one of the growing number of dedicated skill/agent directories.

`howardyang2009/afk-1` already solved this: a search feature that fans a query out
to 14 external sources in parallel, dedupes and ranks the results, and shows a
per-source status. This spec ports that feature into aiblocks, fronted by a
Google-style search box at the top of the home page.

## Goal

- A prominent search input at the top of the aiblocks home page, Google-style.
- Submitting a query lands on a dedicated `/search` results page showing aiblocks'
  own catalog matches first, then results aggregated from external sources.
- The user picks which kind of component they want (Skill, Subagent, Prompt, MCP
  server, Hook, Slash command, Claude plugin, CLAUDE.md, Model) via a radio-button
  pill row under the search box — no dropdown, no auto-detection/classifier.
- The ported search logic stays in its own tree, decoupled from aiblocks' existing
  `lib/`, so it can be updated by re-diffing against afk-1 later without touching
  aiblocks-specific code.

Explicitly out of scope for this pass:
- Any new external API keys being provisioned — most of the 14 adapters will sit
  `disabled` until keys are added to `.env.local`, which the existing orchestrator
  already handles gracefully.
- An `/api/search` HTTP endpoint. The results page fetches server-side directly,
  matching how the rest of aiblocks (home page, `/browse`) already does data
  fetching — no client-side fetch layer is needed for this pass.
- Query auto-classification (guessing type from free text). Considered and
  rejected: the type is user-selected explicitly via the radio pills instead.
- Correcting/improving individual adapters' result quality, ranking weights, or
  adding new sources beyond afk-1's existing 14.

## Architecture

Two new, self-contained trees; nothing existing is modified except the home page
and `.env.example`.

```
lib/external-search/
  types.ts              # ComponentType, AdapterId, SearchResult, SearchAdapter
  config.ts              # getConfig() — reads all adapter API keys from env
  adapters/
    types.ts
    index.ts             # createAdapters(), selectAdapters()
    github.ts / github-url.ts
    huggingface.ts
    brave.ts
    google.ts
    skillsmp.ts
    smithery.ts
    claude-plugins-dev.ts
    claude-plugin-hub.ts
    claude-skills-info.ts
    skills-sh.ts
    skills-pawgrammer.ts
    skills-pub.ts
    skill-store-io.ts
    terminal-skills-io.ts
    *.test.ts            # one per adapter, ported unchanged
  search/
    orchestrator.ts       # runSearch() — the module's single entry point
    dedupe.ts
    rank.ts
    *.test.ts

components/external-search/
  SearchTypeField.tsx     # the 9-option radio-pill row (shared by home + /search)
  ExternalResultCard.tsx  # one external result, aiblocks-styled
  ExternalResultsList.tsx
```

This is a near-verbatim port of afk-1's `src/lib/{adapters,search,config.ts,types.ts}`
— same file names, same exports, same tests. The only changes are import-path
touch-ups (afk-1 uses `@/lib/...`, aiblocks' `@/*` alias also points at repo root,
so most imports need no change at all) and, where relevant, restyled JSX in the
components layer only.

No API route, no `zod` dependency (afk-1's only dependency, used solely in the
API route this design drops). All 14 adapters hit JSON APIs directly — none of
them require an HTML-parsing library, so no new npm dependencies are introduced.

`app/(public)/search/page.tsx` is the only consumer of `lib/external-search`. It
calls `runSearch(createAdapters(getConfig()), q, type)` directly, server-side.

## Component type selector

Implemented as a real HTML radio group, not a client-side widget:

```html
<input type="radio" name="type" value="skill" id="t-skill" class="peer sr-only" defaultChecked />
<label for="t-skill" class="pill peer-checked:bg-ink peer-checked:text-paper">Skill</label>
```

Nine such pairs (`skill` checked by default), wrapping to a second row on narrow
viewports, inside a `<form method="get" action="/search">` alongside the text
input (`name="q"`). Submitting the form — pressing Enter — issues a normal GET
navigation to `/search?q=...&type=...`. No `onSubmit` handler, no React state,
works with JS disabled. `SearchTypeField` is reused on `/search` itself (pre-checking
whichever `type` is in the URL) so switching type there just re-submits the form.

## Home page layout

Current hero (headline, subcopy, "Browse components"/"Publish yours" CTAs, and
the assembly-grid illustration) moves down to become a second section. A new
section is inserted above it:

- AiBlocks mark + a one-line tagline
- The big centered search input
- The type pill row below it
- Generous vertical whitespace, nothing else competing for attention

"How it works" and "Latest components" sections stay where they are, further
down the page, unchanged.

## `/search` results page

Async server component reading `searchParams: { q, type, source }`:

1. `q` — trimmed. If empty, redirect to `/`.
2. `type` — validated against the 9-value `ComponentType` enum; falls back to
   `skill` if missing or invalid.
3. `source` — optional external-source filter, defaults to "all". Rendered as
   plain `Link`s (`?source=github`, etc.) that filter the already-fetched results
   array server-side — no refetch, same technique `/browse`'s sort links already
   use.

Two sections, aiblocks catalog first:

- **"From AiBlocks"** — `listPublishedComponents` + the existing `ComponentCard`
  grid (visually identical to the home page's "Latest components" section). Text
  search uses `q`. Additionally, where the selected `type` maps cleanly onto
  aiblocks' existing tag taxonomy, the catalog query is also filtered by that tag:

  | `type`      | aiblocks tag  |
  | ----------- | ------------- |
  | `skill`     | `skill`       |
  | `subagent`  | `agent`       |
  | `hook`      | `hook`        |
  | `prompt`    | `prompt`      |
  | `mcp`       | `mcp-server`  |
  | `claude-md` | `claude-md`   |

  `model`, `claude-plugin`, and `slash-command` have no aiblocks tag equivalent,
  so those three just use the text search with no tag filter. This mapping is
  aiblocks-specific glue and lives in `app/(public)/search/page.tsx` (or a small
  colocated helper), **not** inside `lib/external-search` — that module stays
  ignorant of aiblocks' own data model so it can be re-ported cleanly later.

- **"From around the web"** — `ExternalResultsList` rendering `runSearch(...)`
  output, restyled with aiblocks tokens (`font-mono` source badges, `rounded-block`
  borders, `text-accent` links) in place of afk-1's plain CSS. Per-source status
  (e.g. `brave: disabled — add API key`) rendered in the same monospace "eyebrow"
  style used elsewhere on the site.

Empty state (no catalog matches and no external results): "No results for
'{q}'. Try a different type or a different query."

## Testing

- All 14 adapters' existing `*.test.ts`, plus `dedupe.test.ts`, `rank.test.ts`,
  `orchestrator.test.ts`, `config.test.ts`, and `index.test.ts` are ported
  unchanged (import-path touch-ups only) — pure unit tests, no framework coupling,
  should pass under aiblocks' existing Vitest config as-is.
- `route.test.ts` is dropped — there's no API route in this design.
- New colocated unit tests for: `/search` searchParams validation/fallback logic,
  and the type→tag mapping helper.
- No Playwright e2e coverage added in this pass (existing e2e suite covers
  browse/publish/engage flows; this is a separate follow-up if wanted).

## Environment variables

`.env.example` gets the afk-1 keys appended, each commented exactly as afk-1
documents them (optional/raises-rate-limit vs. required-to-enable):

```
# --- External component search ---
GITHUB_TOKEN=
SKILLSMP_API_KEY=
SMITHERY_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_PROJECT_ID=
GOOGLE_SEARCH_ENGINE_ID=
BRAVE_SEARCH_API_KEY=
HUGGINGFACE_API_TOKEN=
SKILLS_SH_API_KEY=
```

None of these are required for the feature to work end-to-end: GitHub and
Hugging Face function keyless (lower rate limit only), and every other adapter
reports `disabled` gracefully via the existing orchestrator status when its key
is absent.
