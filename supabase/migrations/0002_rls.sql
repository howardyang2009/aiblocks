-- ============================================================
-- AiBlocks — Row Level Security (RLS) Policies
-- File: supabase/migrations/0002_rls.sql
-- Run AFTER 0001_init.sql, in the Supabase SQL editor.
-- ============================================================
--
-- SECURITY MODEL (read this before editing)
-- ------------------------------------------------------------
-- There are two access paths to the database:
--
--   1. SERVER (service_role key) — your Next.js API routes.
--      The service_role key BYPASSES every policy below. This is
--      where the real enforcement lives: the download paywall,
--      purchase creation, the Stripe webhook. Those routes check
--      entitlement in code before acting. RLS does not constrain them.
--
--   2. BROWSER (anon key) — anything client-side, e.g. a client
--      component reading Supabase directly. THIS is what the policies
--      below govern. The goal: the public can read published catalog
--      data, and nobody can write or read private rows directly with
--      the anon key, bypassing your server logic.
--
-- CLERK NOTE
-- ------------------------------------------------------------
-- These policies identify the user via auth.jwt() ->> 'sub', which
-- (with the Clerk<->Supabase JWT integration configured) returns the
-- Clerk user id — the same value stored in profiles.clerk_user_id.
-- Until that integration is set up, auth.jwt() is null, so every
-- user-scoped policy below simply denies — which is safe. Public
-- read policies still work because they don't depend on identity.
--
-- Helper expression used throughout to resolve "my profile id":
--   (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
-- ============================================================


-- ------------------------------------------------------------
-- Enable RLS on every table. Once enabled, the default is DENY;
-- only the policies we add below open specific access.
-- ------------------------------------------------------------
alter table profiles       enable row level security;
alter table components     enable row level security;
alter table tags           enable row level security;
alter table component_tags enable row level security;
alter table stars          enable row level security;
alter table purchases      enable row level security;
alter table downloads      enable row level security;
alter table reviews        enable row level security;
alter table comments       enable row level security;


-- ============================================================
-- PROFILES
-- Public can read profiles (seller pages are public).
-- A user may update only their own profile.
-- Inserts happen server-side (service_role) on first sign-in.
-- ============================================================
create policy "profiles: public read"
  on profiles for select
  using (true);

create policy "profiles: self update"
  on profiles for update
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');


-- ============================================================
-- COMPONENTS
-- Public can read only PUBLISHED components.
-- A seller can read all of their own (incl. unpublished),
-- and insert / update / delete only their own.
-- (Your publish route uses service_role, but these policies
--  make direct anon access safe too.)
-- ============================================================
create policy "components: public read published"
  on components for select
  using (status = 'published');

create policy "components: owner read all"
  on components for select
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "components: owner insert"
  on components for insert
  with check (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "components: owner update"
  on components for update
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'))
  with check (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "components: owner delete"
  on components for delete
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- TAGS  (public taxonomy)
-- Anyone can read tags (powers browse + autocomplete).
-- Any signed-in user may create a tag (used while publishing).
-- No update/delete from the client.
-- ============================================================
create policy "tags: public read"
  on tags for select
  using (true);

create policy "tags: authed insert"
  on tags for insert
  with check (auth.jwt() ->> 'sub' is not null);


-- ============================================================
-- COMPONENT_TAGS  (join table)
-- Public can read (needed to show a component's tags / filter).
-- A user may attach/detach tags only on components they own.
-- ============================================================
create policy "component_tags: public read"
  on component_tags for select
  using (true);

create policy "component_tags: owner insert"
  on component_tags for insert
  with check (
    component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

create policy "component_tags: owner delete"
  on component_tags for delete
  using (
    component_id in (
      select id from components
      where seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );


-- ============================================================
-- STARS
-- Public can read (star counts / who starred is not sensitive).
-- A user may add or remove only their own star.
-- ============================================================
create policy "stars: public read"
  on stars for select
  using (true);

create policy "stars: self insert"
  on stars for insert
  with check (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "stars: self delete"
  on stars for delete
  using (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- PURCHASES  (sensitive — money)
-- A buyer may read only their own purchases. A seller may read
-- purchases of their components (to see sales).
-- NO client insert/update: purchases are created and marked
-- 'succeeded' ONLY server-side (checkout route + Stripe webhook,
-- via service_role). This is deliberate — never let the client
-- write payment state.
-- ============================================================
create policy "purchases: buyer read own"
  on purchases for select
  using (buyer_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "purchases: seller read own sales"
  on purchases for select
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- DOWNLOADS  (the entitlement / library table)
-- A user may read only their own library (powers My Downloads).
-- NO client insert: entitlements are granted ONLY server-side
-- (free download route, or the webhook after a paid purchase).
-- This is what keeps the paywall honest.
-- ============================================================
create policy "downloads: self read"
  on downloads for select
  using (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- REVIEWS  (V2 — policies ready now)
-- Public can read reviews. A verified buyer (has a downloads row
-- for that component) may write/update/delete their own review.
-- ============================================================
create policy "reviews: public read"
  on reviews for select
  using (true);

create policy "reviews: verified buyer insert"
  on reviews for insert
  with check (
    buyer_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    and exists (
      select 1 from downloads d
      where d.component_id = reviews.component_id
        and d.user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

create policy "reviews: author update"
  on reviews for update
  using (buyer_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'))
  with check (buyer_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "reviews: author delete"
  on reviews for delete
  using (buyer_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- COMMENTS  (V2 — policies ready now)
-- Public can read. Any signed-in user may post a comment as
-- themselves, and edit/delete only their own.
-- ============================================================
create policy "comments: public read"
  on comments for select
  using (true);

create policy "comments: self insert"
  on comments for insert
  with check (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "comments: author update"
  on comments for update
  using (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'))
  with check (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "comments: author delete"
  on comments for delete
  using (user_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));


-- ============================================================
-- STORAGE: component-zips bucket
-- ------------------------------------------------------------
-- The bucket is PRIVATE, so there are no public read policies —
-- downloads are served exclusively via short-lived signed URLs
-- generated server-side (service_role) after an entitlement check.
-- We intentionally add NO anon policies on storage.objects for this
-- bucket. Do not add a public-read policy here, or you will defeat
-- the paywall. Uploads also go through signed upload URLs minted
-- server-side, so no client write policy is needed either.
-- ============================================================

-- End of RLS policies.
