-- ============================================================
-- 0006_rename_model_tag_to_llm.sql
-- ============================================================
-- The "model" ComponentType was renamed to "llm" (see
-- lib/external-search/adapters/types.ts and search-query.ts).
-- Renaming the tag to match.
--
-- tags.name is unique, so a plain UPDATE would fail if an "llm"
-- tag row already exists. Handle that by relinking components onto
-- the existing "llm" row (skipping links that would duplicate a
-- component_tags primary key) and dropping the now-empty "model" row,
-- falling back to a plain rename otherwise.
-- ============================================================

do $$
declare
  model_tag_id  uuid;
  llm_tag_id    uuid;
begin
  select id into model_tag_id from tags where name = 'model';
  if model_tag_id is null then
    return;
  end if;

  select id into llm_tag_id from tags where name = 'llm';

  if llm_tag_id is null then
    update tags set name = 'llm' where id = model_tag_id;
  else
    insert into component_tags (component_id, tag_id)
    select component_id, llm_tag_id
    from component_tags
    where tag_id = model_tag_id
    on conflict (component_id, tag_id) do nothing;

    delete from tags where id = model_tag_id;
  end if;
end $$;

-- End of 0006.
