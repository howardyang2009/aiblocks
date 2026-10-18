# Research: i18n library for the App Router

Ticket: #39 (part of #38). Researched 2026-10-18.

## Context (from this repo)

- `next@^16.2.10`, **locked at 16.2.10** in `package-lock.json`. Latest on npm is 16.4.2.
- `react@18.3.1`, `@clerk/nextjs@^7.5.12`.
- `proxy.ts` exports `clerkMiddleware(...)` with Clerk's default matcher (skips `_next` + static files, always runs on `/(api|trpc)(.*)`). Protects `/dashboard(.*)`.
- `app/layout.tsx` hardcodes `<html lang="en">`; route groups `(public)`, `(auth)`, `dashboard`, `api`. No i18n today.
- Locales: `de` (default), `en`, `zh-CN`.

## Candidates

1. **next-intl** (v4.14.9)
2. **Built-in dictionary pattern** from the Next.js i18n guide (hand-rolled proxy redirect + `getDictionary()`)
3. **next-i18next v16** (i18next + react-i18next; App Router support is new in v16)

Other libraries Next.js lists (next-international, paraglide-next, lingui, tolgee, intlayer, gt-next) were not evaluated in depth; none offers something the three above lack for a 3-locale marketing-style site.

## Comparison

| Criterion | next-intl 4.14 | Built-in dictionaries | next-i18next 16 |
|---|---|---|---|
| Next 16 / `proxy.ts` | Yes. Docs use `proxy.ts` ("called `middleware.ts` up until Next.js 16"). Peer dep `next ^12..^16`. | Yes. Official guide is written against `proxy.js`. | Yes. `createProxy` from `next-i18next/proxy`, README notes Next 16 `proxy.ts`. |
| React 18.3 | Peer dep `react ^16.8 \|\| ^17 \|\| ^18 \|\| ^19`. | N/A | Peer dep `react >= 18`. |
| Compose with `clerkMiddleware` | Documented by **both** Clerk and next-intl: return `intlMiddleware(req)` from inside `clerkMiddleware`. | Hand-write redirect logic inside the Clerk callback. Easy but all ours. | Not documented by Clerk or next-i18next. `createProxy` should be callable the same way, but unverified. |
| Server components | `getTranslations()` / `useTranslations` in RSC. | Native (server-only `import()` of JSON). | `getT()` from `next-i18next/server`. |
| Static rendering | With `next/root-params` (default in Next 16.3+) pages are statically renderable; on older 16.x use legacy `setRequestLocale` in each layout/page. `generateStaticParams` per locale. | `generateStaticParams` per locale; fully static. `next/root-params` optional. | `generateI18nStaticParams()`; README says `getT()` doesn't opt out of prerendering. |
| ICU plurals / select | Built in (ICU syntax, `Intl.PluralRules`), plus `t.rich` for React tags. | None. Need to add `intl-messageformat` or hand-roll plurals. | Optional: add `i18next-icu` + `intl-messageformat`; default is i18next's own plural format. |
| Type-safe keys | `AppConfig` augmentation: keys and namespaces checked; arguments checked via experimental `createMessagesDeclaration`. | Free: `typeof dict` from the default locale JSON. Arguments not typed. | Keys via i18next types (`npx i18next-cli types`); ICU arg types with i18next >= 26.5. |
| Missing-key detection | Logs error + renders `namespace.key`; `onError` with `IntlErrorCode.MISSING_MESSAGE`, `getMessageFallback`. Compile-time via types for the default locale. | Only compile-time via types (other locales unchecked unless we add a test). | i18next `missingKeyHandler` / `saveMissing` (standard i18next). |
| Bundle cost | Server components ship 0 message JS. Client: ~4 KB gzip per client translation with experimental `precompile: true` (4.8+), which drops ~9 KB of ICU parser. | Zero library JS; client components need props passed down. | i18next + react-i18next runtime on client, more if `i18next-icu`. Heaviest of the three. |
| Locale detection | Prefix > cookie > `accept-language` (`@formatjs/intl-localematcher`) > default. `localePrefix` options (e.g. `as-needed` keeps `/` = `de`). | Write it (guide uses `negotiator` + `@formatjs/intl-localematcher`). No cookie handling. | `createProxy` handles detection/redirect; `localeInPath` options incl. `'internal'`. |
| Locale-aware `Link`/redirect | `createNavigation(routing)` gives `Link`, `redirect`, `usePathname`, `getPathname`. | Write it. | `useChangeLanguage()`; no localized `Link` helper documented. |
| Maintenance | Releases every few days (4.14.0 to 4.14.9 Aug to Oct 2026); 4.4k stars, 54 open issues; single main maintainer (Jan Amann). Listed first in Next.js docs. | Owned by Next.js docs; no dependency. | i18next org, 6.2k stars, pushed 2026-10-17. App Router support only since v16 (newer path). |

## Recommendation: next-intl

1. **Only option where the Clerk composition is documented on both sides.** Clerk's `clerkMiddleware` reference shows returning `createMiddleware(...)(req)` from inside the Clerk handler; next-intl's middleware docs show the same with `await auth.protect()`. This is the riskiest integration point for us and it is a known pattern.
2. **Covers the #38 open items out of the box**: ICU plurals, `useFormatter` for EUR prices/dates, `getPathname` for hreflang/sitemap alternates, `getTranslations({locale})` in `generateMetadata`, localized `Link`.
3. **Server-first, SSR friendly**: messages stay on the server for RSC; static rendering keeps working.
4. **Light-touch fit**: AiBlocks is parked (#38). Building detection, cookie, navigation helpers and plural handling by hand (built-in pattern) is more code we own; next-i18next v16's App Router path is newer and its Clerk composition is undocumented.

The built-in dictionary pattern is the fallback if we want zero dependencies and accept no ICU and hand-written routing helpers.

Sketch of the combined `proxy.ts` (not implemented; for the spec):

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const isProtected = createRouteMatcher(["/dashboard(.*)", "/:locale/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
  if (req.nextUrl.pathname.startsWith("/api") || req.nextUrl.pathname.startsWith("/trpc")) return;
  return handleI18nRouting(req);
});
// keep Clerk's existing matcher so API routes still get Clerk auth
```

## Open risks

- **Next version vs `next/root-params`.** next-intl's recommended static setup reads the locale from `next/root-params`, default only in **Next 16.3+**. The lockfile pins **16.2.10**. Either bump Next to 16.3+ (16.4.2 is current) as part of the i18n work, enable `experimental.rootParams`, or use the legacy `setRequestLocale` in every layout/page. Decide in the spec. **Resolved in #45:** upgrade to Next 16.4.x in its own PR first (#52), then use `next/root-params`. Only the 8 content routes need static rendering.
- **Protected-route matcher must include the locale prefix.** Current matcher is `/dashboard(.*)`; with locale prefixes it must also match `/:locale/dashboard(.*)` or `/dashboard` would become unprotected. Clerk docs also say middleware is not the best place to protect routes; data-layer checks should stay.
- **API routes must skip the intl step.** Clerk's matcher runs on `/api`; next-intl's default matcher excludes it. Combined file must keep Clerk on API routes but not redirect them to a locale.
- **Dotted paths** (e.g. seller usernames with `.`) are skipped by next-intl's default matcher; Clerk's matcher is extension-based, which is safer. Keep Clerk's matcher.
- **Root layout move**: `app/layout.tsx` becomes `app/[locale]/layout.tsx` for `<html lang>`; `ClerkProvider` needs `localization` per locale (separate #38 concern).
- **`zh-CN` tag**: use `zh-CN` consistently as the locale id in routing; confirm URL shape (`/zh-CN/...`) in the URL-strategy ticket.
- **Bus factor**: next-intl is effectively one maintainer. Mitigated by large adoption and Next.js docs listing it first; messages are plain ICU JSON, portable to other ICU libraries.
- **`precompile` is experimental** and disallows `t.raw`; optional, not required.

## Sources

- next-intl App Router setup: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
- next-intl proxy/middleware (composition, matcher, detection): https://next-intl.dev/docs/routing/middleware
- next-intl TypeScript: https://next-intl.dev/docs/workflows/typescript
- next-intl configuration (`onError`, `getMessageFallback`): https://next-intl.dev/docs/usage/configuration
- next-intl translations (ICU): https://next-intl.dev/docs/usage/translations
- next-intl AOT compilation: https://next-intl.dev/blog/precompilation
- next-intl releases: https://github.com/amannn/next-intl/releases
- next-intl npm (peer deps): https://www.npmjs.com/package/next-intl
- Clerk `clerkMiddleware` (combine middleware, `proxy.ts`): https://clerk.com/docs/reference/nextjs/clerk-middleware
- Next.js i18n guide (dictionary pattern, `next/root-params`, library list): https://nextjs.org/docs/app/guides/internationalization
- next-i18next README (v16 App Router, `createProxy`, `getT`): https://github.com/i18next/next-i18next
- i18next supported frameworks: https://www.i18next.com/overview/supported-frameworks
