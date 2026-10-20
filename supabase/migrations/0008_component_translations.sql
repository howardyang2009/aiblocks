-- ============================================================
-- 0008_component_translations.sql
-- ============================================================
-- Machine translation of Seller content (ADR 0006, issue #69).
--
-- components.source_language is the language the Seller declares their
-- Source text (description + readme) is written in: one of the three
-- Locales, or 'other'. It stays nullable here so existing rows can be
-- backfilled by scripts/backfill-translations.ts; 0009 makes it NOT NULL.
--
-- component_translations holds one row per Component x Locale x field.
-- `source_hash` is the SHA-256 of the Source text the row was made from:
-- an unchanged field is not re-translated, and a hand row whose hash no
-- longer matches the current Source text is stale.
-- ============================================================

alter table components
  add column source_language text
    check (source_language in ('de', 'en', 'zh-CN', 'other'));

create table component_translations (
    id              uuid primary key default gen_random_uuid(),
    component_id    uuid not null references components(id) on delete cascade,
    locale          text not null check (locale in ('de', 'en', 'zh-CN')),
    field           text not null check (field in ('description', 'readme')),
    text            text,
    kind            text not null default 'machine' check (kind in ('machine', 'hand')),
    source_hash     text not null,
    status          text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
    -- Why a row failed: 'too_long' (readme over 50,000 characters),
    -- 'implausible' (empty or over 3x the input), or 'api_error'.
    failure_reason  text check (failure_reason in ('too_long', 'implausible', 'api_error')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (component_id, locale, field)
);

create index idx_component_translations_component on component_translations (component_id);

create trigger trg_component_translations_updated before update on component_translations
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- RLS mirrors components: anyone reads Translations of published
-- Components; the owning Seller writes only hand rows. The machine job
-- writes with the service role, which bypasses RLS.
-- ------------------------------------------------------------
alter table component_translations enable row level security;

create policy "component_translations: public read published"
  on component_translations for select
  using (component_id in (select id from components where status = 'published'));

create policy "component_translations: owner read all"
  on component_translations for select
  using (
    component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

create policy "component_translations: owner insert hand"
  on component_translations for insert
  with check (
    kind = 'hand'
    and component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

create policy "component_translations: owner update hand"
  on component_translations for update
  using (
    component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  )
  with check (
    kind = 'hand'
    and component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- End of 0008.
