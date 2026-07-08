# External Component Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google-style search box to the aiblocks home page that finds AI components both in aiblocks' own catalog and across 14 external sources (GitHub, Hugging Face, Brave, Google, SkillsMP, Smithery, and 8 niche skill/agent directories), landing on a dedicated `/search` results page.

**Architecture:** Port afk-1's `src/lib/{adapters,search,config.ts,types.ts}` verbatim into a new, self-contained `lib/external-search/` tree (no aiblocks-specific code inside it). A small aiblocks-only glue module (`lib/search-query.ts`) maps the 9 `ComponentType` values to aiblocks catalog tags and validates URL params. A new `components/external-search/` tree holds presentational pieces restyled with aiblocks' design tokens. `app/(public)/search/page.tsx` is the only file that imports both `lib/external-search` and aiblocks' own `lib/browse`, composing catalog results (shown first) with external results — no new API route, matching the existing server-component data-fetching pattern used by the home page and `/browse`.

**Tech Stack:** Next.js App Router (Server Components), TypeScript strict mode, Tailwind CSS (existing aiblocks design tokens), Vitest. No new npm dependencies.

## Global Constraints

- No new npm dependencies — all 14 external adapters call JSON APIs directly; `zod` (afk-1's only dependency) is dropped along with the API route that used it.
- No `/api/search` HTTP route. `app/(public)/search/page.tsx` is an async Server Component that calls the external-search orchestrator directly, matching how the home page and `/browse` already fetch data.
- `lib/external-search/` is a byte-for-byte port of afk-1 commit `d20365f2b7bea14c0ad3ed5d4ce45407c8d122db`'s `src/lib/{adapters,search,config.ts,types.ts}`. Every internal import in that source tree is relative (verified — no `@/` aliases), so files can be copied into their new location with **zero import-path edits**.
- Component type selection is a 9-option native HTML `<input type="radio">` group styled as pills via Tailwind's `peer`/`peer-checked` variants — no client JS, default value `skill`.
- All 9 `ComponentType` values map to an aiblocks catalog tag (`lib/search-query.ts`), even the three with no components tagged that way yet (`model`, `claude-plugin`, `slash-command`) — matches surface automatically once sellers use those tags.
- `SKILLS_SH_API_KEY` is **not** added to `.env.example`. The ported `config.ts` already falls back to `process.env.VERCEL_OIDC_TOKEN` unchanged — Vercel provisions that automatically.
- No new automated tests for `.tsx` files — aiblocks has no existing precedent for component-level unit tests (all current tests are pure-function tests in `lib/*.test.ts`; UI is covered by Playwright e2e, which this spec explicitly keeps out of scope). New `.tsx` files are verified via `tsc --noEmit` plus the manual/dev-server check in the final task.
- Spec: `docs/superpowers/specs/2026-07-08-external-component-search-design.md`.

---

### Task 1: Port shared types, config, and the GitHub-URL helper

**Files:**
- Create: `lib/external-search/adapters/types.ts`
- Create: `lib/external-search/types.ts`
- Create: `lib/external-search/config.ts`
- Create: `lib/external-search/config.test.ts`
- Create: `lib/external-search/adapters/github-url.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `ComponentType`, `AdapterId`, `SearchResult`, `SearchAdapter`, `FetchLike` (from `lib/external-search/adapters/types.ts`, re-exported by `lib/external-search/types.ts`); `AppConfig`, `getConfig(): AppConfig` (from `lib/external-search/config.ts`); `githubUrlOf(link: string): string | undefined` (from `lib/external-search/adapters/github-url.ts`).

- [ ] **Step 1: Fetch the pinned afk-1 source**

```bash
AFK1_SRC=$(mktemp -d)
gh repo clone howardyang2009/afk-1 "$AFK1_SRC"
git -C "$AFK1_SRC" checkout d20365f2b7bea14c0ad3ed5d4ce45407c8d122db
echo "$AFK1_SRC"
```

Keep the printed path — it's used in the next step.

- [ ] **Step 2: Copy the files verbatim**

```bash
mkdir -p lib/external-search/adapters
cp "$AFK1_SRC/src/lib/adapters/types.ts" lib/external-search/adapters/types.ts
cp "$AFK1_SRC/src/lib/types.ts" lib/external-search/types.ts
cp "$AFK1_SRC/src/lib/config.ts" lib/external-search/config.ts
cp "$AFK1_SRC/src/lib/config.test.ts" lib/external-search/config.test.ts
cp "$AFK1_SRC/src/lib/adapters/github-url.ts" lib/external-search/adapters/github-url.ts
```

- [ ] **Step 3: Run the ported config test**

Run: `npx vitest run lib/external-search/config.test.ts`
Expected: `Test Files 1 passed`, `Tests 3 passed`, 0 failed.

- [ ] **Step 4: Document the new env vars**

Append to `.env.example` (after the existing `--- App ---` block):

```
# --- External component search ---
# Optional — raises GitHub API rate limit (works without it)
GITHUB_TOKEN=
# Optional — raises SkillsMP rate limit (works without it)
SKILLSMP_API_KEY=
# Required to enable the Smithery adapter
SMITHERY_API_KEY=
# All three required to enable the Google Agent Search fallback
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_PROJECT_ID=
GOOGLE_SEARCH_ENGINE_ID=
# Required to enable the Brave adapter
BRAVE_SEARCH_API_KEY=
# Optional — raises Hugging Face rate limit (works without it)
HUGGINGFACE_API_TOKEN=
```

(`SKILLS_SH_API_KEY` is intentionally omitted — see Global Constraints.)

- [ ] **Step 5: Commit**

```bash
git add lib/external-search/adapters/types.ts lib/external-search/types.ts \
  lib/external-search/config.ts lib/external-search/config.test.ts \
  lib/external-search/adapters/github-url.ts .env.example
git commit -m "feat: port external-search types, config, and github-url helper from afk-1"
```

---

### Task 2: Port search orchestration (dedupe, rank, orchestrator)

**Files:**
- Create: `lib/external-search/search/dedupe.ts`
- Create: `lib/external-search/search/dedupe.test.ts`
- Create: `lib/external-search/search/rank.ts`
- Create: `lib/external-search/search/rank.test.ts`
- Create: `lib/external-search/search/orchestrator.ts`
- Create: `lib/external-search/search/orchestrator.test.ts`

**Interfaces:**
- Consumes: `AdapterId`, `SearchResult`, `SearchAdapter`, `ComponentType` from `lib/external-search/adapters/types.ts` (Task 1).
- Produces: `dedupe(results: SearchResult[]): SearchResult[]`; `rank(results: SearchResult[]): SearchResult[]`; `runSearch(adapters: SearchAdapter[], query: string, type: ComponentType, opts?: { timeoutMs?: number }): Promise<SearchResponse>`, `SourceStatus`, `SearchResponse` (from `lib/external-search/search/orchestrator.ts`).

- [ ] **Step 1: Fetch the pinned afk-1 source**

```bash
AFK1_SRC=$(mktemp -d)
gh repo clone howardyang2009/afk-1 "$AFK1_SRC"
git -C "$AFK1_SRC" checkout d20365f2b7bea14c0ad3ed5d4ce45407c8d122db
```

- [ ] **Step 2: Copy the files verbatim**

```bash
mkdir -p lib/external-search/search
cp "$AFK1_SRC/src/lib/search/dedupe.ts" lib/external-search/search/dedupe.ts
cp "$AFK1_SRC/src/lib/search/dedupe.test.ts" lib/external-search/search/dedupe.test.ts
cp "$AFK1_SRC/src/lib/search/rank.ts" lib/external-search/search/rank.ts
cp "$AFK1_SRC/src/lib/search/rank.test.ts" lib/external-search/search/rank.test.ts
cp "$AFK1_SRC/src/lib/search/orchestrator.ts" lib/external-search/search/orchestrator.ts
cp "$AFK1_SRC/src/lib/search/orchestrator.test.ts" lib/external-search/search/orchestrator.test.ts
```

- [ ] **Step 3: Run the ported tests**

Run: `npx vitest run lib/external-search/search`
Expected: all test files pass, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add lib/external-search/search
git commit -m "feat: port external-search dedupe/rank/orchestrator from afk-1"
```

---

### Task 3: Port core external adapters (GitHub, Hugging Face, Brave, Google, SkillsMP, Smithery)

**Files:**
- Create: `lib/external-search/adapters/github.ts`, `github.test.ts`
- Create: `lib/external-search/adapters/huggingface.ts`, `huggingface.test.ts`
- Create: `lib/external-search/adapters/brave.ts`, `brave.test.ts`
- Create: `lib/external-search/adapters/google.ts`, `google.test.ts`
- Create: `lib/external-search/adapters/skillsmp.ts`, `skillsmp.test.ts`
- Create: `lib/external-search/adapters/smithery.ts`, `smithery.test.ts`

**Interfaces:**
- Consumes: `ComponentType`, `FetchLike`, `SearchAdapter`, `SearchResult` from `lib/external-search/adapters/types.ts`; `githubUrlOf` from `lib/external-search/adapters/github-url.ts` (both Task 1).
- Produces: `createGithubAdapter`, `createHuggingfaceAdapter`, `createBraveAdapter`, `createGoogleAdapter`, `createSkillsmpAdapter`, `createSmitheryAdapter` — each `(deps?: { fetchFn?: FetchLike; token?/apiKey?/...: string }) => SearchAdapter`.

- [ ] **Step 1: Fetch the pinned afk-1 source**

```bash
AFK1_SRC=$(mktemp -d)
gh repo clone howardyang2009/afk-1 "$AFK1_SRC"
git -C "$AFK1_SRC" checkout d20365f2b7bea14c0ad3ed5d4ce45407c8d122db
```

- [ ] **Step 2: Copy the files verbatim**

```bash
for f in github huggingface brave google skillsmp smithery; do
  cp "$AFK1_SRC/src/lib/adapters/$f.ts" "lib/external-search/adapters/$f.ts"
  cp "$AFK1_SRC/src/lib/adapters/$f.test.ts" "lib/external-search/adapters/$f.test.ts"
done
```

- [ ] **Step 3: Run the ported tests**

Run: `npx vitest run lib/external-search/adapters/github.test.ts lib/external-search/adapters/huggingface.test.ts lib/external-search/adapters/brave.test.ts lib/external-search/adapters/google.test.ts lib/external-search/adapters/skillsmp.test.ts lib/external-search/adapters/smithery.test.ts`
Expected: all 6 test files pass, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add lib/external-search/adapters/github.ts lib/external-search/adapters/github.test.ts \
  lib/external-search/adapters/huggingface.ts lib/external-search/adapters/huggingface.test.ts \
  lib/external-search/adapters/brave.ts lib/external-search/adapters/brave.test.ts \
  lib/external-search/adapters/google.ts lib/external-search/adapters/google.test.ts \
  lib/external-search/adapters/skillsmp.ts lib/external-search/adapters/skillsmp.test.ts \
  lib/external-search/adapters/smithery.ts lib/external-search/adapters/smithery.test.ts
git commit -m "feat: port core external-search adapters from afk-1"
```

---

### Task 4: Port niche external adapters (8 skill/agent directories)

**Files:**
- Create: `lib/external-search/adapters/claude-plugins-dev.ts`, `.test.ts`
- Create: `lib/external-search/adapters/claude-plugin-hub.ts`, `.test.ts`
- Create: `lib/external-search/adapters/claude-skills-info.ts`, `.test.ts`
- Create: `lib/external-search/adapters/skills-sh.ts`, `.test.ts`
- Create: `lib/external-search/adapters/skills-pawgrammer.ts`, `.test.ts`
- Create: `lib/external-search/adapters/skills-pub.ts`, `.test.ts`
- Create: `lib/external-search/adapters/skill-store-io.ts`, `.test.ts`
- Create: `lib/external-search/adapters/terminal-skills-io.ts`, `.test.ts`

**Interfaces:**
- Consumes: same as Task 3 (`lib/external-search/adapters/types.ts`, `github-url.ts` from Task 1).
- Produces: `createClaudePluginsDevAdapter`, `createClaudePluginHubAdapter`, `createClaudeSkillsInfoAdapter`, `createSkillsShAdapter`, `createSkillsPawgrammerAdapter`, `createSkillsPubAdapter`, `createSkillStoreIoAdapter`, `createTerminalSkillsIoAdapter` — each `(deps?) => SearchAdapter`.

- [ ] **Step 1: Fetch the pinned afk-1 source**

```bash
AFK1_SRC=$(mktemp -d)
gh repo clone howardyang2009/afk-1 "$AFK1_SRC"
git -C "$AFK1_SRC" checkout d20365f2b7bea14c0ad3ed5d4ce45407c8d122db
```

- [ ] **Step 2: Copy the files verbatim**

```bash
for f in claude-plugins-dev claude-plugin-hub claude-skills-info skills-sh \
         skills-pawgrammer skills-pub skill-store-io terminal-skills-io; do
  cp "$AFK1_SRC/src/lib/adapters/$f.ts" "lib/external-search/adapters/$f.ts"
  cp "$AFK1_SRC/src/lib/adapters/$f.test.ts" "lib/external-search/adapters/$f.test.ts"
done
```

- [ ] **Step 3: Run the ported tests**

Run: `npx vitest run lib/external-search/adapters/claude-plugins-dev.test.ts lib/external-search/adapters/claude-plugin-hub.test.ts lib/external-search/adapters/claude-skills-info.test.ts lib/external-search/adapters/skills-sh.test.ts lib/external-search/adapters/skills-pawgrammer.test.ts lib/external-search/adapters/skills-pub.test.ts lib/external-search/adapters/skill-store-io.test.ts lib/external-search/adapters/terminal-skills-io.test.ts`
Expected: all 8 test files pass, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add lib/external-search/adapters/claude-plugins-dev.ts lib/external-search/adapters/claude-plugins-dev.test.ts \
  lib/external-search/adapters/claude-plugin-hub.ts lib/external-search/adapters/claude-plugin-hub.test.ts \
  lib/external-search/adapters/claude-skills-info.ts lib/external-search/adapters/claude-skills-info.test.ts \
  lib/external-search/adapters/skills-sh.ts lib/external-search/adapters/skills-sh.test.ts \
  lib/external-search/adapters/skills-pawgrammer.ts lib/external-search/adapters/skills-pawgrammer.test.ts \
  lib/external-search/adapters/skills-pub.ts lib/external-search/adapters/skills-pub.test.ts \
  lib/external-search/adapters/skill-store-io.ts lib/external-search/adapters/skill-store-io.test.ts \
  lib/external-search/adapters/terminal-skills-io.ts lib/external-search/adapters/terminal-skills-io.test.ts
git commit -m "feat: port niche external-search adapters from afk-1"
```

---

### Task 5: Port the adapter registry

**Files:**
- Create: `lib/external-search/adapters/index.ts`
- Create: `lib/external-search/adapters/index.test.ts`

**Interfaces:**
- Consumes: `AppConfig` (Task 1); all 14 `create*Adapter` functions (Tasks 3 and 4); `ComponentType`, `FetchLike`, `SearchAdapter` (Task 1).
- Produces: `createAdapters(config: AppConfig, fetchFn?: FetchLike): SearchAdapter[]`, `selectAdapters(adapters: SearchAdapter[], type: ComponentType): SearchAdapter[]`.

- [ ] **Step 1: Fetch the pinned afk-1 source**

```bash
AFK1_SRC=$(mktemp -d)
gh repo clone howardyang2009/afk-1 "$AFK1_SRC"
git -C "$AFK1_SRC" checkout d20365f2b7bea14c0ad3ed5d4ce45407c8d122db
```

- [ ] **Step 2: Copy the files verbatim**

```bash
cp "$AFK1_SRC/src/lib/adapters/index.ts" lib/external-search/adapters/index.ts
cp "$AFK1_SRC/src/lib/adapters/index.test.ts" lib/external-search/adapters/index.test.ts
```

- [ ] **Step 3: Run the full external-search test suite**

Run: `npx vitest run lib/external-search`
Expected: all test files (config, search/*, all 14 adapters, index) pass, 0 failed. This is the first point where the entire ported tree is wired together — if anything is missing from Tasks 1–4, it will fail to resolve an import here.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/external-search/adapters/index.ts lib/external-search/adapters/index.test.ts
git commit -m "feat: port external-search adapter registry from afk-1"
```

---

### Task 6: aiblocks type-to-tag mapping and searchParams validation

**Files:**
- Create: `lib/search-query.ts`
- Create: `lib/search-query.test.ts`

**Interfaces:**
- Consumes: `ComponentType` from `lib/external-search/types.ts` (Task 1).
- Produces: `COMPONENT_TYPES: ComponentType[]`, `DEFAULT_COMPONENT_TYPE: ComponentType`, `isComponentType(value: string): value is ComponentType`, `resolveComponentType(raw: string | undefined): ComponentType`, `tagForComponentType(type: ComponentType): string`.

- [ ] **Step 1: Write the failing test**

Create `lib/search-query.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COMPONENT_TYPES, DEFAULT_COMPONENT_TYPE, resolveComponentType, tagForComponentType } from "./search-query";

describe("resolveComponentType", () => {
  it("returns the default type when raw is undefined", () => {
    expect(resolveComponentType(undefined)).toBe("skill");
  });

  it("returns the default type when raw is not a known type", () => {
    expect(resolveComponentType("not-a-type")).toBe(DEFAULT_COMPONENT_TYPE);
  });

  it("returns the matching type when raw is a known type", () => {
    expect(resolveComponentType("mcp")).toBe("mcp");
    expect(resolveComponentType("claude-md")).toBe("claude-md");
  });
});

describe("tagForComponentType", () => {
  it("maps every component type to its aiblocks catalog tag", () => {
    const expected: Record<string, string> = {
      skill: "skill",
      subagent: "agent",
      prompt: "prompt",
      mcp: "mcp-server",
      hook: "hook",
      "slash-command": "slash-command",
      "claude-plugin": "claude-plugin",
      "claude-md": "claude-md",
      model: "model",
    };
    for (const type of COMPONENT_TYPES) {
      expect(tagForComponentType(type)).toBe(expected[type]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search-query.test.ts`
Expected: FAIL — `Cannot find module './search-query'`.

- [ ] **Step 3: Write the implementation**

Create `lib/search-query.ts`:

```ts
import type { ComponentType } from "@/lib/external-search/types";

export const COMPONENT_TYPES: ComponentType[] = [
  "skill",
  "subagent",
  "prompt",
  "mcp",
  "hook",
  "slash-command",
  "claude-plugin",
  "claude-md",
  "model",
];

export const DEFAULT_COMPONENT_TYPE: ComponentType = "skill";

export function isComponentType(value: string): value is ComponentType {
  return (COMPONENT_TYPES as string[]).includes(value);
}

export function resolveComponentType(raw: string | undefined): ComponentType {
  if (raw && isComponentType(raw)) return raw;
  return DEFAULT_COMPONENT_TYPE;
}

const TYPE_TO_TAG: Record<ComponentType, string> = {
  skill: "skill",
  subagent: "agent",
  prompt: "prompt",
  mcp: "mcp-server",
  hook: "hook",
  "slash-command": "slash-command",
  "claude-plugin": "claude-plugin",
  "claude-md": "claude-md",
  model: "model",
};

export function tagForComponentType(type: ComponentType): string {
  return TYPE_TO_TAG[type];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search-query.test.ts`
Expected: `Tests 4 passed`, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add lib/search-query.ts lib/search-query.test.ts
git commit -m "feat: add component-type-to-tag mapping for external search"
```

---

### Task 7: Type selector and search form components

**Files:**
- Create: `components/external-search/SearchTypeField.tsx`
- Create: `components/external-search/ExternalSearchForm.tsx`

**Interfaces:**
- Consumes: `ComponentType` from `lib/external-search/types.ts` (Task 1).
- Produces: `SearchTypeField({ selected }: { selected: ComponentType })`; `ExternalSearchForm({ defaultQuery, selectedType }: { defaultQuery?: string; selectedType?: ComponentType })` — both React Server Components (no `"use client"`), consumed by Task 9 (`/search` page) and Task 10 (home page).

- [ ] **Step 1: Create the type selector**

Create `components/external-search/SearchTypeField.tsx`:

```tsx
import type { ComponentType } from "@/lib/external-search/types";

const TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: "skill", label: "Skill" },
  { value: "subagent", label: "Subagent" },
  { value: "prompt", label: "Prompt" },
  { value: "mcp", label: "MCP server" },
  { value: "hook", label: "Hook" },
  { value: "slash-command", label: "Slash command" },
  { value: "claude-plugin", label: "Claude plugin" },
  { value: "claude-md", label: "CLAUDE.md" },
  { value: "model", label: "Model" },
];

// A real HTML radio group styled as pills — no client JS. Each hidden
// radio drives its sibling label via Tailwind's peer-checked variant, so
// the selected type travels with a plain GET form submit.
export function SearchTypeField({ selected }: { selected: ComponentType }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Component type">
      {TYPE_OPTIONS.map((opt) => (
        <div key={opt.value}>
          <input
            type="radio"
            name="type"
            value={opt.value}
            id={`type-${opt.value}`}
            defaultChecked={opt.value === selected}
            className="peer sr-only"
          />
          <label
            htmlFor={`type-${opt.value}`}
            className="cursor-pointer select-none rounded-block border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper"
          >
            {opt.label}
          </label>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the search form wrapper**

Create `components/external-search/ExternalSearchForm.tsx`:

```tsx
import type { ComponentType } from "@/lib/external-search/types";
import { SearchTypeField } from "./SearchTypeField";

// Plain GET form to /search — works with JS disabled. Shared by the home
// page hero (no defaults) and the /search results page (pre-filled from
// the current query params).
export function ExternalSearchForm({
  defaultQuery = "",
  selectedType = "skill",
}: {
  defaultQuery?: string;
  selectedType?: ComponentType;
}) {
  return (
    <form action="/search" method="get">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Describe the skill, agent, prompt, or MCP server you're looking for…"
        className="w-full rounded-block border bg-surface px-5 py-3.5 text-base focus:outline-none focus:border-accent"
      />
      <div className="mt-4">
        <SearchTypeField selected={selectedType} />
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="submit"
          className="rounded-block bg-ink text-paper px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (No unit test for these two files — see Global Constraints; they're exercised by the dev-server check in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add components/external-search/SearchTypeField.tsx components/external-search/ExternalSearchForm.tsx
git commit -m "feat: add zero-JS search type selector and search form"
```

---

### Task 8: External result card and list components

**Files:**
- Create: `components/external-search/ExternalResultCard.tsx`
- Create: `components/external-search/ExternalResultsList.tsx`

**Interfaces:**
- Consumes: `SearchResult` from `lib/external-search/types.ts` (Task 1).
- Produces: `ExternalResultCard({ result }: { result: SearchResult })`; `ExternalResultsList({ results }: { results: SearchResult[] })` — consumed by Task 9 (`/search` page).

- [ ] **Step 1: Create the result card**

Create `components/external-search/ExternalResultCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { SearchResult } from "@/lib/external-search/types";

const MAX_DESC_CHARS = 400;

// The only client-side island in this feature: expanding a long
// description doesn't need a page navigation or a server round-trip.
export function ExternalResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const description = result.description ?? "";
  const isLong = description.length > MAX_DESC_CHARS;
  const shown = expanded || !isLong ? description : `${description.slice(0, MAX_DESC_CHARS)}…`;

  return (
    <div className="rounded-block border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="font-display font-medium leading-tight hover:text-accent"
        >
          {result.title}
        </a>
        {typeof result.stars === "number" && (
          <span className="font-mono text-[11px] text-subtle shrink-0">★ {result.stars}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {(result.sources ?? [result.source]).map((s) => (
          <span key={s} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">
            {s}
          </span>
        ))}
      </div>

      {description && (
        <p className="mt-2 text-sm text-muted">
          {shown}
          {isLong && (
            <button
              type="button"
              className="ml-1 text-accent hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the results list**

Create `components/external-search/ExternalResultsList.tsx`:

```tsx
import type { SearchResult } from "@/lib/external-search/types";
import { ExternalResultCard } from "./ExternalResultCard";

export function ExternalResultsList({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted">No results from external sources.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result) => (
        <ExternalResultCard key={`${result.source}:${result.url}`} result={result} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/external-search/ExternalResultCard.tsx components/external-search/ExternalResultsList.tsx
git commit -m "feat: add external search result card and list components"
```

---

### Task 9: `/search` results page

**Files:**
- Create: `app/(public)/search/page.tsx`

**Interfaces:**
- Consumes: `resolveComponentType`, `tagForComponentType` (Task 6); `ExternalSearchForm` (Task 7); `ExternalResultsList` (Task 8); `createAdapters`, `selectAdapters` (Task 5); `getConfig` (Task 1); `runSearch` (Task 2); `AdapterId` (Task 1); existing `listPublishedComponents`, `ListComponentsDb` from `lib/browse.ts`; existing `narrowDb` from `lib/db-port.ts`; existing `createServiceClient` from `lib/supabase/server.ts`; existing `ComponentCard` from `components/component-card.tsx`.

- [ ] **Step 1: Create the results page**

Create `app/(public)/search/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/browse";
import { ComponentCard } from "@/components/component-card";
import { ExternalSearchForm } from "@/components/external-search/ExternalSearchForm";
import { ExternalResultsList } from "@/components/external-search/ExternalResultsList";
import { resolveComponentType, tagForComponentType } from "@/lib/search-query";
import { createAdapters, selectAdapters } from "@/lib/external-search/adapters";
import { getConfig } from "@/lib/external-search/config";
import { runSearch } from "@/lib/external-search/search/orchestrator";
import type { AdapterId } from "@/lib/external-search/types";

export const dynamic = "force-dynamic";

type Search = { q?: string; type?: string; source?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const q = resolved.q?.trim();
  if (!q) redirect("/");

  const type = resolveComponentType(resolved.type);
  const tag = tagForComponentType(type);

  const [{ components: catalogMatches }, external] = await Promise.all([
    listPublishedComponents(narrowDb<ListComponentsDb>(createServiceClient()), { q, tag }),
    runSearch(selectAdapters(createAdapters(getConfig()), type), q, type),
  ]);

  const activeSource = resolved.source;
  const externalResults = activeSource
    ? external.results.filter((r) => (r.sources ?? [r.source]).includes(activeSource as AdapterId))
    : external.results;

  const availableSources = external.sources.filter((s) => s.status === "ok" && s.count > 0);
  const hasAnyResults = catalogMatches.length > 0 || externalResults.length > 0;

  function sourceHref(source?: string) {
    const p = new URLSearchParams({ q, type });
    if (source) p.set("source", source);
    return `/search?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <ExternalSearchForm defaultQuery={q} selectedType={type} />
      </div>

      {!hasAnyResults && (
        <p className="mt-10 text-center text-muted">
          No results for &ldquo;{q}&rdquo;. Try a different type or a different query.
        </p>
      )}

      {catalogMatches.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-xl">From AiBlocks</h2>
            <Link
              href={`/browse?q=${encodeURIComponent(q)}&tag=${tag}`}
              className="font-mono text-xs text-accent hover:underline"
            >
              browse all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {catalogMatches.slice(0, 6).map((c) => (
              <ComponentCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl">From around the web</h2>
          {availableSources.length > 0 && (
            <div className="flex flex-wrap gap-3 font-mono text-xs">
              <Link href={sourceHref()} className={!activeSource ? "text-accent" : "text-subtle hover:text-ink"}>
                all
              </Link>
              {availableSources.map((s) => (
                <Link
                  key={s.source}
                  href={sourceHref(s.source)}
                  className={activeSource === s.source ? "text-accent" : "text-subtle hover:text-ink"}
                >
                  {s.source} ({s.count})
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-subtle">
          {external.sources.map((s) => (
            <span key={s.source}>
              {s.source}: {s.status === "ok" ? s.count : s.status}
            </span>
          ))}
        </div>

        <div className="mt-4">
          <ExternalResultsList results={externalResults} />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full unit test suite**

Run: `npm run test`
Expected: every test file (pre-existing aiblocks tests + all of Tasks 1–6's new tests) passes, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/search/page.tsx"
git commit -m "feat: add /search results page combining catalog and external results"
```

---

### Task 10: Home page — Google-style search hero

**Files:**
- Modify: `app/(public)/page.tsx`

**Interfaces:**
- Consumes: `ExternalSearchForm` (Task 7).

- [ ] **Step 1: Add the search hero section and demote the existing hero heading**

Replace the full contents of `app/(public)/page.tsx` with:

```tsx
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { COMPONENT_SUMMARY_COLS } from "@/lib/constants";
import { ComponentCard } from "@/components/component-card";
import { AssemblyGrid } from "@/components/brand/assembly-grid";
import { ExternalSearchForm } from "@/components/external-search/ExternalSearchForm";
import type { ComponentSummary } from "@/types/database";

// Home. A Google-style search is the first thing a visitor sees; the
// assembly-grid hero (the brand signature) follows right below it.
export const dynamic = "force-dynamic";

const Pimary_TAGS = ["mcp-server", "claude-md", "agent", "hook", "prompt", "skill"];

export default async function HomePage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("components")
    .select(COMPONENT_SUMMARY_COLS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);
  const latest = (data ?? []) as ComponentSummary[];

  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Search hero */}
      <section className="py-20 lg:py-28 text-center">
        <p className="eyebrow">Search everywhere</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mt-3">
          Find the AI component you need.
        </h1>
        <p className="mt-3 text-muted">
          Skills, agents, prompts, MCP servers, and models — from AiBlocks and around the web.
        </p>
        <div className="mt-8 max-w-2xl mx-auto">
          <ExternalSearchForm />
        </div>
      </section>

      {/* Hero */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-24 border-t">
        <div>
          <p className="eyebrow">Open marketplace · multi-ecosystem</p>
          <h2 className="font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl mt-4 leading-[1.05]">
            Reusable AI components,<br />ready to snap in.
          </h2>
          <p className="mt-5 text-muted max-w-md">
            Publish and download AI building blocks — prompts, skills, agents, MCP
            servers, CLAUDE.md configs, hooks — for Claude, GPT, Gemini, and more.
            Free or paid, your price, your payout.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/browse" className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Browse components
            </Link>
            <Link href="/dashboard/seller/new" className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
              Publish yours
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {Pimary_TAGS.map((t) => (
              <Link key={t} href={`/browse?tag=${t}`} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-muted hover:border-accent">
                {t}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">npm for AI components</p>
        </div>
      </section>

      {/* How it works — a real sequence, so numbering is earned */}
      <section className="py-12 border-t">
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            ["01", "Publish", "Upload a zip, write a README, set a price — or make it free."],
            ["02", "Discover", "Buyers search and filter by tag and ecosystem to find the block they need."],
            ["03", "Earn", "Paid downloads go straight to your Stripe account. 0% platform fee at launch."],
          ].map(([n, h, b]) => (
            <div key={n}>
              <span className="font-mono text-xs text-accent">{n}</span>
              <h3 className="font-display font-medium text-lg mt-2">{h}</h3>
              <p className="text-sm text-muted mt-1.5">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest components — real data */}
      {latest.length > 0 && (
        <section className="py-12 border-t">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-2xl">Latest components</h2>
            <Link href="/browse" className="font-mono text-xs text-accent hover:underline">browse all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {latest.map((c) => <ComponentCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

    </div>
  );
}
```

Note: the original hero's `<h1>` became `<h2>` (sized down from `text-4xl sm:text-5xl lg:text-6xl` to `text-3xl sm:text-4xl lg:text-5xl`) since the page now has exactly one `<h1>` — the new search hero's heading. A `border-t` was added to the hero section so it reads as a visually distinct block below the search hero, consistent with how every other section on this page already uses `border-t`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/page.tsx"
git commit -m "feat: add Google-style search hero to the home page"
```

---

### Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: all test files pass, 0 failed.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 4: Dev-server smoke test**

```bash
npm run dev &
DEV_PID=$!
until curl -s -o /dev/null http://localhost:3000; do sleep 1; done

# Home page shows the new search hero
curl -s http://localhost:3000/ | grep -q "Find the AI component you need." && echo "home hero OK"

# Submitting the form (GET) lands on a working /search page
curl -s -o /dev/null -w "search page status: %{http_code}\n" "http://localhost:3000/search?q=postgres&type=mcp"

# Empty query redirects home
curl -s -o /dev/null -w "empty query status: %{http_code}\n" "http://localhost:3000/search?q=&type=skill"

kill $DEV_PID
```

Expected: `home hero OK` is printed; `/search?q=postgres&type=mcp` returns `200`; the empty-query request returns a redirect (`307` or `200` after following, depending on `curl` defaults — either way it must not be a `500`).

- [ ] **Step 5: Manual check in a browser**

Start `npm run dev`, open `http://localhost:3000`, and confirm:
- The search hero renders above the existing marketing hero, with "Skill" selected by default among the 9 type pills.
- Typing a query and clicking a different pill (e.g. "MCP server"), then submitting, navigates to `/search?q=...&type=mcp`.
- The `/search` page shows a "From around the web" section with GitHub results (works keyless) and a per-source status line showing every other adapter as `disabled` (expected — no API keys configured yet).
- If any aiblocks catalog component happens to match the query/tag, a "From AiBlocks" section appears above the external results.
- Clicking a source filter link (e.g. `github (N)`) narrows the external results to that source; clicking "all" restores the full list.
- A nonsense query (e.g. `zzzqqqxxx123`) shows the "No results for..." empty state.
- Resizing to a narrow viewport wraps the type pills onto a second line without breaking layout.

- [ ] **Step 6: Final commit (if manual check step 5 required fixes)**

If step 5 surfaced any issue, fix it, re-run steps 1–4, then:

```bash
git add -A
git commit -m "fix: address issues found in external search manual verification"
```

If step 5 required no fixes, there is nothing to commit — the feature is complete as of Task 10's commit.
