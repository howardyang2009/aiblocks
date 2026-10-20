-- ============================================================
-- 0011_drop_redundant_translation_index.sql
-- ============================================================
-- The display lookups (lib/translation/display.ts) filter
-- component_translations by component_id + locale (+ field). The
-- unique (component_id, locale, field) constraint from 0008 already
-- backs them with a composite index, whose leading column also serves
-- any lookup by component_id alone. The single-column index from 0008
-- only adds write cost (issue #84).
-- ============================================================

drop index if exists idx_component_translations_component;

-- End of 0011.
