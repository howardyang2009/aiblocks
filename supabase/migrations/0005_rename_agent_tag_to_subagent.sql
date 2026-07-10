-- ============================================================
-- 0005_rename_agent_tag_to_subagent.sql
-- ============================================================
-- The "subagent" component type was cataloged under the tag name
-- "agent" (see lib/search-query.ts). Renaming the tag to "subagent"
-- to match the component type and its UI label.
--
-- tags.name is unique, so a plain UPDATE would fail if a "subagent"
-- tag row already exists. Handle that by relinking components onto
-- the existing "subagent" row (skipping links that would duplicate a
-- component_tags primary key) and dropping the now-empty "agent" row,
-- falling back to a plain rename otherwise.
-- ============================================================

do $$
declare
  agent_tag_id     uuid;
  subagent_tag_id  uuid;
begin
  select id into agent_tag_id from tags where name = 'agent';
  if agent_tag_id is null then
    return;
  end if;

  select id into subagent_tag_id from tags where name = 'subagent';

  if subagent_tag_id is null then
    update tags set name = 'subagent' where id = agent_tag_id;
  else
    insert into component_tags (component_id, tag_id)
    select component_id, subagent_tag_id
    from component_tags
    where tag_id = agent_tag_id
    on conflict (component_id, tag_id) do nothing;

    delete from tags where id = agent_tag_id;
  end if;
end $$;

-- End of 0005.
