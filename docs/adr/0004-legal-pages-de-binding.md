# Only the German version of a Legal page is binding

The Impressum, privacy policy, and terms are German-law documents. Only the `de` version of each Legal page is binding, and it is the master text: every change lands in `de` first. The `en` and `zh-CN` versions are full convenience translations derived from `de`, each with a notice that only the German version is binding (the Impressum needs no notice, since it states facts, not terms). Each version carries its own last-updated date; a translation may lag behind `de` and then says so, so a change to `de` never waits for its translations. The terms gain a language clause naming German as the contract language. The German text is drafted by Claude from the current English pages and reviewed by a lawyer (terms and privacy policy); the Impressum is checked by the operator.

The Withdrawal waiver is the Buyer's own declaration, not a term, so it does not follow the binding-language rule: the checkout checkbox and Stripe Checkout `custom_text` show the waiver in the Buyer's Locale, link to that Locale's `/{locale}/terms#refunds`, and state that the contract language is German. Its German wording is aligned with the terms' withdrawal clause and goes through the same lawyer review.

**Considered Options:** Making `de` and `en` both binding, with `de` winning on conflict, and making all three Locales equally binding were both rejected: every binding version needs its own legal review, and every extra version adds a way for the texts to contradict each other. Showing only a notice that links to the German text on `en` and `zh-CN` was rejected because GDPR Art. 12 requires privacy information to be intelligible to the audience the site addresses.

**Consequences:**
- Sprachrisiko is open: a Buyer who shops entirely in `zh-CN` or `en` may argue the German terms were never validly incorporated. The language clause and the contract-language line at checkout reduce the risk; the lawyer review must confirm this decision holds, or switch to `de` and `en` both binding.
- The Claude-drafted German Legal pages go live with the i18n launch, before the lawyer review finishes, marked as drafts. Until the review is done, the binding text is unreviewed.
- Changing the binding language later affects contracts already concluded under the old rule, so treat this decision as fixed once the review confirms it.
