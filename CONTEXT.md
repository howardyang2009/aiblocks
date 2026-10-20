# aiblocks

A marketplace where sellers publish reusable AI components and buyers acquire them, free or paid, through Stripe Checkout.

## Language

### People

**Profile**:
The app's own record of a user, keyed by Clerk's `clerk_user_id`. Created lazily the first time it's needed, not at sign-up — every check of ownership, authorship, or payout status resolves down to a Profile, never to the Clerk identity directly.
_Avoid_: User, account

**Viewer**:
Whoever is looking at a page right now: a Clerk identity paired with its Profile, or nothing at all for a signed-out visitor. The page-rendering counterpart to `AuthContext` (API routes) — a Viewer is allowed to be signed out; an `AuthContext` is not.
_Avoid_: Current user, session

**Seller**:
A Profile that has published at least one Component. Whether a Seller can actually receive money is tracked separately as payout status.
_Avoid_: Vendor, publisher

**Buyer**:
The Profile on the paying side of a Purchase.
_Avoid_: Customer

### Commerce

**Component**:
A single reusable AI building block listed in the marketplace — the thing that gets bought, downloaded, starred, reviewed, and commented on.
_Avoid_: Item, product, listing

**Tag**:
A free-form label a Seller attaches to a Component, case-insensitive (`Claude` and `claude` are the same Tag). A few well-known Tags are featured on the home page, but that is only a display choice: there is no separate category concept. Tags are Seller content, so they show as submitted in every Locale.
_Avoid_: Category, label

**Ecosystem**:
An AI platform a Component works with, such as `claude`, `gpt` or `gemini`. Named by the Seller and shown as submitted in every Locale.
_Avoid_: Platform, model

**Price**:
What a Buyer pays for a Component, set by its Seller. Always in euros, for every Component, and the same amount in every Locale: a Locale changes only how the number is written, never the currency or the amount. A Price of zero makes the Component free.
_Avoid_: Cost, fee

**Entitlement**:
Whether someone has access to a Component. Free Components grant one on first download with no Purchase involved; paid Components grant one only once a Purchase succeeds.
_Avoid_: Ownership, access, license

**Purchase**:
The record of a Buyer acquiring a paid Component through Stripe. Starts pending when Checkout begins, and only becomes succeeded once the Stripe webhook confirms payment — a Purchase and an Entitlement are different things; the Entitlement follows from the Purchase, not the other way around.
_Avoid_: Order, transaction, sale

**Withdrawal waiver**:
The EU/EEA consumer-rights waiver a Buyer must give before paying for digital content, giving up their 14-day right of withdrawal in exchange for immediate access. Enforced three times over: the checkout UI, the API, and Stripe's own consent step. The Buyer always sees the waiver wording in their own Locale, because it is the Buyer's own declaration and they must understand what they give up.
_Avoid_: Refund policy, consent

### Engagement

**Comment**:
Open discussion on a Component — any signed-in Viewer may post one, not just Buyers. One level of threading only: a reply's parent must itself be a top-level Comment on the same Component.
_Avoid_: Message, post

**Review**:
A verified-buyer rating (1-5) plus optional text on a Component. "Verified" means an Entitlement exists for that Buyer and Component — the same fact the download paywall checks. One Review per Buyer per Component.
_Avoid_: Rating, feedback

**Seller reply**:
A Seller's public response to a Review of their own Component. One Seller reply per Review.
_Avoid_: Response, comment

**Star**:
A Viewer's bookmark on a Component — a simple toggle, not gated by Entitlement.
_Avoid_: Favorite, like

### Site

**Locale**:
One of the three language versions of the site: German (`de`, the default), English (`en`), and Simplified Chinese (`zh-CN`). Every page URL names its Locale; a URL without one is only a doorway that sends the visitor to a Locale. Covers the site's own copy and Translations of Source text. Tags, Ecosystems, Component names, Comments and Reviews show as submitted in every Locale.
_Avoid_: Language, region

**Source copy**:
The `en` version of the site's own copy, the text everything else is translated from. A new string is written in `en` first; the `de` and `zh-CN` versions are translations of it, drafted by Claude and reviewed afterwards by a native speaker. Legal pages are the one exception: there the `de` version is the master.
_Avoid_: Original, base language

**Source text**:
A Component's `description` and `readme` exactly as its Seller wrote them, together with the language the Seller declares they are written in: one of the three Locales, or another language. Not detected automatically. Different from Source copy, which is the site's own text.
_Avoid_: Original, user content

**Translation**:
The version of a Component's Source text in one Locale. Starts as a machine translation, which is redone every time the Source text changes. Once the Seller corrects it by hand it is hand-edited: it is no longer overwritten, and when the Source text changes afterwards it is flagged as stale to the Seller until they edit or re-translate it. The Locale the Source text is written in needs no Translation. Readers see a machine Translation labelled as machine-translated, with a way to show the Source text; a hand-edited Translation counts as the Seller's own words and is not labelled. Until a Translation exists, that Locale shows the Source text.
_Avoid_: Localization, version

**Legal page**:
The Impressum, the privacy policy, or the terms. Only the `de` version is binding and it is the master text: every change lands in `de` first, and the `en` and `zh-CN` versions are full convenience translations derived from it that say so. A translation may lag behind `de`; each version carries its own last-updated date and says when it is behind. The Impressum needs no convenience-translation notice, since it states facts, not terms.
_Avoid_: Policy page, legal docs
