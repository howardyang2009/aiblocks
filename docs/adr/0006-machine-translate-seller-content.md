# Seller content is machine-translated with Claude; hand edits are never overwritten

A Component's Source text (`description` and `readme`) is machine-translated into every Locale it is not written in, using Claude Haiku 5.5. The Seller declares the source language (one of the three Locales or another language); it is never detected at runtime. The Seller can correct each Translation by hand on the Component edit page. A hand-edited Translation is never overwritten: when the Source text changes afterwards, it is flagged as stale to the Seller, who edits it or asks for a fresh machine translation. Machine Translations are redone automatically on every Source text change and are labelled as machine-translated to readers, with a way to show the Source text. `name`, Tags, Ecosystems, Comments and Reviews are not translated.

This reverses the i18n map's (#38) original out-of-scope line on translating user-generated content. Translation runs in the background after save; until a Translation exists, or if it failed, the Locale shows the Source text. Search matches a query against the Source text and all Translations of `description`, so a query in any Locale can find a Component written in another.

**Considered Options:** DeepL was rejected because `readme` is markdown with code blocks and Claude keeps that structure more reliably, with glossary-style instructions taken from `docs/i18n-glossary.md`, and without a second translation vendor. Automatic source-language detection was rejected in favour of a Seller declaration, which is explicit and correctable. Overwriting hand edits on every source change was rejected because it silently destroys Seller work; keeping them silently was rejected because they drift out of date unnoticed. Translating synchronously on save was rejected because a long `readme` would block the save for many seconds. Searching only the viewer's Locale version was rejected because it hides Components written in another language.

**Consequences:**
- Each Translation records which Source text it was made from, so staleness is detectable and an unchanged field is not re-translated.
- Seller text is sent to Anthropic; the privacy page must name Anthropic as a processor.
- Seller text is untrusted model input. The output is rendered through the same markdown sanitizer as Source text, and an implausible output (empty, or far longer than the input) is treated as a failed Translation.
- Translated `readme` is capped at 50,000 characters to bound cost; a longer `readme` shows as Source text in other Locales.
- Removing machine translation later is cheap for readers (fall back to Source text) but discards Sellers' hand-edited Translations.
