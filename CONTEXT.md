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

**Entitlement**:
Whether someone has access to a Component. Free Components grant one on first download with no Purchase involved; paid Components grant one only once a Purchase succeeds.
_Avoid_: Ownership, access, license

**Purchase**:
The record of a Buyer acquiring a paid Component through Stripe. Starts pending when Checkout begins, and only becomes succeeded once the Stripe webhook confirms payment — a Purchase and an Entitlement are different things; the Entitlement follows from the Purchase, not the other way around.
_Avoid_: Order, transaction, sale

**Withdrawal waiver**:
The EU/EEA consumer-rights waiver a Buyer must give before paying for digital content, giving up their 14-day right of withdrawal in exchange for immediate access. Enforced three times over: the checkout UI, the API, and Stripe's own consent step.
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
