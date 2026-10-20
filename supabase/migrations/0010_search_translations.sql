-- ============================================================
-- 0010_search_translations.sql
-- ============================================================
-- Search finds a Component by its Translations too (ADR 0006, issue #70).
--
-- components.search_tsv was a generated column over name + description
-- with the `english` config. A generated column cannot read another
-- table, so it becomes a plain column kept current by two triggers: one on
-- components (name or description changed) and one on
-- component_translations (a description Translation changed).
--
-- It covers name (weight A), the Source description and every `ready`
-- description Translation (weight B). The `simple` config does no
-- stemming, so one index serves queries in German, English and Chinese
-- alike; lib/commerce/browse.ts searches with the same config.
-- ============================================================

alter table components drop column search_tsv; -- drops components_search_idx too
alter table components add column search_tsv tsvector;

-- Called only from the two trigger functions below, which run as the
-- owner: every ready Translation is indexed, whoever writes the row. Not
-- callable over the API, since it reads Translations of unpublished
-- Components.
create or replace function component_search_tsv(p_component_id uuid, p_name text, p_description text)
returns tsvector
language sql stable
set search_path = public
as $$
  select setweight(to_tsvector('simple', coalesce(p_name, '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p_description, '')), 'B')
      || setweight(to_tsvector('simple', coalesce((
           select string_agg(t.text, ' ')
           from component_translations t
           where t.component_id = p_component_id
             and t.field = 'description'
             and t.status = 'ready'
             and t.text is not null
         ), '')), 'B');
$$;

revoke execute on function component_search_tsv(uuid, text, text) from public, anon, authenticated;

create or replace function components_refresh_search_tsv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.search_tsv := component_search_tsv(new.id, new.name, new.description);
  return new;
end;
$$;

create trigger trg_components_search before insert or update of name, description on components
    for each row execute function components_refresh_search_tsv();

-- Both trigger functions are security definer: the machine job writes with
-- the service role, but a Seller's own edit (#71) must index the same
-- Translations. A trigger function cannot be called over the API.
create or replace function component_translations_refresh_search_tsv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed component_translations;
begin
  changed := case when tg_op = 'DELETE' then old else new end;
  if changed.field = 'description' or (tg_op = 'UPDATE' and old.field = 'description') then
    update components
       set search_tsv = component_search_tsv(id, name, description)
     where id = changed.component_id;
  end if;
  return null;
end;
$$;

create trigger trg_component_translations_search after insert or update or delete on component_translations
    for each row execute function component_translations_refresh_search_tsv();

-- Refreshing search_tsv alone is not an edit of the Component: keep
-- updated_at for changes to anything else.
drop trigger trg_components_updated on components;
create trigger trg_components_updated before update on components
    for each row
    when ((to_jsonb(old) - 'search_tsv' - 'updated_at') is distinct from (to_jsonb(new) - 'search_tsv' - 'updated_at'))
    execute function set_updated_at();

update components set search_tsv = component_search_tsv(id, name, description);

create index components_search_idx on components using gin (search_tsv);

-- End of 0010.
