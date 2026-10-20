-- ============================================================
-- 0009_source_language_not_null.sql
-- ============================================================
-- Every Component declares its source language (issue #69). Apply this
-- only after scripts/backfill-translations.ts has filled
-- components.source_language for every existing row; on a fresh database
-- (CI, `supabase db reset`) there are no rows to backfill.
-- ============================================================

alter table components alter column source_language set not null;

-- End of 0009.
