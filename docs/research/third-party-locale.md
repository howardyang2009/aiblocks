# Passing the locale through to Clerk and Stripe

Research for issue #40 (part of the i18n map #38). Site locales: `de` (default), `en`, `zh-CN`.
Versions checked: `@clerk/nextjs` 7.9.17 installed (`^7.5.12` in `package.json`), `stripe` 16.12.0 installed (`^16.9.0`).
Researched 2026-10-18.

## Summary table

| Surface | How to set | `de` | `en` | `zh-CN` | Scope | Gap |
|---|---|---|---|---|---|---|
| Clerk components (`<SignIn>`, `<SignUp>`, `<UserButton>`, modal `<SignInButton>`) | `localization` prop on `<ClerkProvider>` from `@clerk/localizations` | `deDE` | `enUS` (default) | `zhCN` | Per request (whatever the layout passes) | Experimental API; only `en-US` officially maintained, `de-DE`/`zh-CN` are community translations |
| Clerk hosted pages (Account Portal) | None | - | - | - | - | Stays English. Not used by AiBlocks today (sign-in/up are in-app routes) |
| Clerk emails (verification codes, magic links) | Dashboard template editor, one template per instance | manual | manual | manual | Per instance, not per user | No per-user locale. Workaround: turn off "Delivered by Clerk" and send localized mail from a webhook |
| Stripe Checkout (hosted page) | `locale` param on `checkout.sessions.create` | `de` | `en` | `zh` | Per request | No `zh-CN` value; use `zh` (Simplified). Our own `custom_text` strings are not translated by Stripe |
| Stripe Connect onboarding (Express, Account Links) | No API parameter | (auto) | (auto) | (auto) | Not controllable | Cannot force a language; Stripe localizes onboarding into German, English, Simplified Chinese among others |
| Stripe receipts / post-purchase invoice emails | Customer `preferred_locales`, else Dashboard default email language, else browser locale | `de` | `en` | `zh` (assumed, see below) | Per customer, fallback per account | AiBlocks creates no Customer, so receipts fall back to account default / browser |

## Clerk

### Components

Docs: [Localization prop (experimental)](https://clerk.com/docs/guides/customizing-clerk/localization), package README [clerk/javascript packages/localizations](https://github.com/clerk/javascript/tree/main/packages/localizations).

- Install `@clerk/localizations`, import the locale object (tag with the hyphen removed: `de-DE` -> `deDE`) and pass it as `<ClerkProvider localization={deDE}>`.
- Objects for our locales: `deDE` (de-DE), `enUS` (en-US, Clerk's default; `enGB` also exists), `zhCN` (zh-CN).
- Per-language subpath imports exist (for example `@clerk/localizations/de-DE`) to keep the bundle to one language; the docs note dev builds may otherwise ship every language. Dynamic import is the documented route for runtime switching.
- Status: the docs mark the feature experimental ("may change or be removed without notice"). The README says Clerk "only maintains the `en-US`" locale; the others are community contributions, so German/Chinese strings may have gaps or lag new UI.
- Individual keys can be overridden by spreading the object and adding keys; error messages live under `unstable__errors`.
- Mapping: site `de` -> `deDE`, `en` -> `enUS`, `zh-CN` -> `zhCN`. Per request: the value is whatever the server layout passes, so it follows the active route locale.

### Hosted pages (Account Portal)

Same docs page: localization applies only to components in the app; the Account Portal "will remain in English". AiBlocks does not use it: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` (`.env.example`) point at in-app routes rendering `<SignIn />`/`<SignUp />`. No action needed as long as that stays true.

### Emails

Docs: [Email and SMS templates](https://clerk.com/docs/guides/customizing-clerk/email-sms-templates).

- Templates are edited in the Clerk Dashboard, one per template type per instance. The docs suggest the editor as a way to translate content when English "is not the default locale of your application", which means picking one language for everyone.
- No documented per-user locale or locale-based template selection was found.
- Workaround: toggle "Delivered by Clerk" off for a template and send the email yourself from the `email.created` webhook event (the docs page spells it `emails.created`), choosing language from user metadata (for example `publicMetadata.locale` written when the user signs up or switches locale). That is a real feature (webhook route + mail provider), probably out of scope for the light-touch #38.
- Pragmatic option for #38: translate the Dashboard templates into German (default locale) or keep English, and accept a single language for auth emails.

## Stripe

### Checkout

Docs: [Create a Checkout Session, `locale`](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-locale).

- `locale` is an enum; blank or `auto` uses the browser locale.
- Values for us: `de`, `en` (also `en-GB`), `zh`. There is no `zh-CN`; the enum has `zh`, `zh-HK`, `zh-TW`, so `zh` is Simplified. Confirmed in installed `stripe@16.12.0` types (`types/Checkout/SessionsResource.d.ts`, `zh | zh-HK | zh-TW`), so no SDK upgrade needed.
- Per request: set on each session from the buyer's active locale.
- Our own strings are not translated by Stripe: `custom_text.terms_of_service_acceptance.message` in `lib/commerce/purchases.ts` is hardcoded English (ToS + withdrawal waiver wording). It needs a per-locale string, and since it is a legal consent text it should come from the legal-pages ticket. Product name (`product_data.name`) is user content and stays as-is.

### Connect onboarding (Express, Account Links)

Docs: [Create an account link](https://docs.stripe.com/api/account_links/create), [Using Express connected accounts](https://docs.stripe.com/connect/express-accounts).

- `accountLinks.create` takes only `account`, `type`, `refresh_url`, `return_url`, `collection_options` (and deprecated `collect`). No locale parameter.
- The Express guide says onboarding is localized into many languages including English, German, Simplified Chinese and Traditional Chinese. How the language is chosen is not stated; presumably the browser language (inference, not documented).
- Gap: we cannot force the seller's onboarding language. Only thing we can pass is a locale-prefixed `refresh_url`/`return_url` so the seller lands back on the right site locale.
- Note: Stripe now labels the `type: "express"` account model legacy in favor of Accounts v2. Not relevant to locale; no change suggested here.

### Receipts and post-purchase emails

Docs: [Receipts and paid invoices, Localization and Connect sections](https://docs.stripe.com/receipts), [Customer `preferred_locales`](https://docs.stripe.com/api/customers/object#customer_object-preferred_locales).

- Language is decided from customer info at session creation: a v1 Customer's `preferred_locales` (array, ordered by preference) wins; with a Customer but no locale, the **default language** in Dashboard Settings > Customer emails is used; with no customer info at all, the buyer's browser locale when they open the Checkout URL.
- AiBlocks uses destination charges (`payment_intent_data.transfer_data.destination`), so receipts use the **platform** account's Customer emails, branding and public details settings, not the seller's.
- AiBlocks creates no Customer today (`checkout.sessions.create` has no `customer`, no `customer_creation`), so buyers fall into the "no customer info" or account-default path. To make receipts per-buyer you would create/reuse a Customer with `preferred_locales: ["de"]` (or `en`, `zh`) and pass `customer`, which also means storing a Stripe customer id per buyer. Lighter option: set the Dashboard default email language to German and rely on the browser fallback.
- Assumption: `preferred_locales` takes the same tags as Checkout `locale` (`zh` for Simplified). The docs do not list the accepted values on the Customer object; verify in test mode before relying on it.

## Code locations that would change

- `app/layout.tsx`: `<ClerkProvider>` (line 20) needs `localization={...}` chosen from the active locale; also hardcoded `lang="en"`. If the URL strategy puts the locale in a segment, `ClerkProvider` likely moves into (or reads from) the locale layout.
- `package.json`: add `@clerk/localizations`.
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`: no change for language; paths may move under a locale segment, which then also changes `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`SIGN_UP_URL` in `.env.example`, `.env.test.local.example`, `.github/workflows/ci.yml`.
- `components/layout/navbar.tsx`: `<SignInButton mode="modal">`, `<UserButton>` pick up the provider localization automatically.
- `lib/commerce/purchases.ts` (`checkout.sessions.create`, around line 123): add `locale` (map `zh-CN` -> `zh`), translate `custom_text` message, locale-prefix `success_url`/`cancel_url`. The function needs the buyer's locale as an argument.
- `lib/commerce/seller.ts` (`accountLinks.create`, around line 168): only locale-prefix `refresh_url`/`return_url`; no locale param exists.
- `lib/commerce/seller.test.ts`, purchase tests: update expected call args.
- Clerk Dashboard (email templates) and Stripe Dashboard (Customer emails default language): manual, per-account settings, not code.

## Gaps (short list)

1. Clerk emails: one language per instance; per-user language needs self-delivery via webhook.
2. Clerk Account Portal: English only (not used today).
3. Clerk `de-DE`/`zh-CN` translations: community-maintained, experimental API.
4. Stripe Checkout: no `zh-CN` code, use `zh`; our `custom_text` legal string must be translated by us.
5. Stripe Connect onboarding: no locale parameter at all.
6. Stripe receipts: per Customer (`preferred_locales`) or per account default; AiBlocks has no Customers, so effectively account default or browser locale.
