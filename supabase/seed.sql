-- Local-dev only. Auto-applied by `supabase start` / `supabase db reset`,
-- never run against the hosted project.
--
-- The hosted Supabase project grants anon/authenticated/service_role full
-- table privileges automatically when it's provisioned — that happens
-- out-of-band, so it's never appeared in migrations 0001-0004. A fresh
-- local Postgres created by `supabase start` doesn't replicate it, leaving
-- every table without SELECT/INSERT/UPDATE/DELETE for those roles (only
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN). RLS policies are the real access
-- gate either way — this just restores the baseline grants they sit on top of.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
