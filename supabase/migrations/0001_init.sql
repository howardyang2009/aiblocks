-- ============================================================
-- AiBlocks — Supabase / PostgreSQL Schema
-- ============================================================
-- A marketplace for reusable AI components.
-- Auth is handled by Clerk (NOT Supabase Auth), so user identity
-- is stored as the Clerk user id (text), not a FK to auth.users.
--
-- Run this in the Supabase SQL editor. V1 tables come first;
-- V2 tables (reviews, comments) are included but clearly marked
-- so the data model is future-proof from day one.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
-- (pg_trgm optional, useful later for fuzzy tag autocomplete)
-- create extension if not exists "pg_trgm";


-- ============================================================
-- 1. PROFILES  (V1)
-- One row per user. Buyers and sellers are the same table;
-- a user "becomes" a seller simply by publishing a component.
-- ============================================================
create table profiles (
    id              uuid primary key default gen_random_uuid(),
    clerk_user_id   text unique not null,          -- identity from Clerk
    username        text unique not null,           -- used in /sellers/[username]
    display_name    text,
    bio             text,
    avatar_url      text,

    -- public links (GitHub, Twitter/X, personal site)
    github_url      text,
    twitter_url     text,
    website_url     text,

    -- Stripe Connect: the seller's connected account id.
    -- Null until the user onboards as a seller. NEVER store secret keys here.
    stripe_account_id        text,
    stripe_onboarding_done   boolean not null default false,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on column profiles.clerk_user_id is 'Clerk user id; the bridge between Clerk auth and our data.';
comment on column profiles.stripe_account_id is 'Stripe Connect account id only. Never store Stripe secret keys in the DB.';


-- ============================================================
-- 2. COMPONENTS  (V1)
-- The core product: a publishable, downloadable AI building block.
-- ============================================================
create table components (
    id              uuid primary key default gen_random_uuid(),
    seller_id       uuid not null references profiles(id) on delete cascade,

    name            text not null,
    slug            text unique,                    -- optional SEO-friendly URL
    description     text not null,                  -- short summary (search + cards)
    readme          text,                           -- full markdown, rendered on detail page

    -- Which AI ecosystems this works with: e.g. {'claude','gpt','gemini'}.
    -- Array keeps filtering simple and supports multi-ecosystem components.
    ecosystems      text[] not null default '{}',

    -- Pricing. Always store money as integer cents to avoid float errors.
    -- price_cents = 0  -> free component (no paywall).
    price_cents     integer not null default 0 check (price_cents >= 0),
    currency        text not null default 'usd',

    -- Uploaded zip lives in Supabase Storage; we store its object path,
    -- NOT a public URL. Downloads are served via short-lived signed URLs.
    zip_path        text,
    zip_size_bytes  integer check (zip_size_bytes is null or zip_size_bytes <= 10485760), -- 10MB cap

    -- Denormalized counters for fast display (kept in sync by triggers below).
    star_count      integer not null default 0,
    download_count  integer not null default 0,

    -- Open submission, but allow soft removal for abuse handling (V2 admin).
    status          text not null default 'published'
                     check (status in ('published','unpublished','removed')),

    -- Full-text search vector over name + description (V1 search feature).
    search_tsv      tsvector generated always as (
                        setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
                        setweight(to_tsvector('english', coalesce(description,'')), 'B')
                     ) stored,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on column components.price_cents is 'Money in integer cents. 0 = free.';
comment on column components.zip_path is 'Supabase Storage object path. Served only via signed URLs after access check.';


-- ============================================================
-- 3. TAGS  (V1)
-- Free-form tags, but stored normalized so autocomplete and
-- "popular tags" work, and so 'Claude' / 'claude' converge.
-- ============================================================
create table tags (
    id          uuid primary key default gen_random_uuid(),
    name        text unique not null,               -- store lowercased on insert
    created_at  timestamptz not null default now()
);

-- Many-to-many between components and tags.
create table component_tags (
    component_id  uuid not null references components(id) on delete cascade,
    tag_id        uuid not null references tags(id) on delete cascade,
    primary key (component_id, tag_id)
);


-- ============================================================
-- 4. STARS  (V1)
-- A user can star a component once. Powers star_count and /dashboard/stars.
-- ============================================================
create table stars (
    user_id       uuid not null references profiles(id) on delete cascade,
    component_id  uuid not null references components(id) on delete cascade,
    created_at    timestamptz not null default now(),
    primary key (user_id, component_id)
);


-- ============================================================
-- 5. PURCHASES  (V1)
-- Payment records for PAID components, backed by Stripe.
-- A successful purchase is what unlocks a paid download.
-- ============================================================
create table purchases (
    id                        uuid primary key default gen_random_uuid(),
    buyer_id                  uuid not null references profiles(id) on delete restrict,
    component_id              uuid not null references components(id) on delete restrict,
    seller_id                 uuid not null references profiles(id) on delete restrict,

    amount_cents              integer not null check (amount_cents >= 0),
    currency                  text not null default 'usd',

    -- Stripe references for reconciliation and webhook confirmation.
    stripe_payment_intent_id  text unique,
    stripe_checkout_session_id text unique,

    -- Download is only released once status = 'succeeded' (set by webhook).
    status                    text not null default 'pending'
                              check (status in ('pending','succeeded','failed','refunded')),

    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

comment on table purchases is 'Paid-component payment records. Webhook flips status to succeeded, which grants download access.';


-- ============================================================
-- 6. DOWNLOADS / LIBRARY  (V1)
-- The entitlement record: "this user has access to this component."
-- Created on a free download OR after a successful purchase.
-- This is the source of truth for /dashboard/downloads (re-download anytime).
-- ============================================================
create table downloads (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references profiles(id) on delete cascade,
    component_id  uuid not null references components(id) on delete cascade,

    -- Null for a free acquisition; set for a paid one.
    purchase_id   uuid references purchases(id) on delete set null,

    acquired_at   timestamptz not null default now(),

    -- One library entry per user+component (re-downloads don't duplicate).
    unique (user_id, component_id)
);

comment on table downloads is 'User library / entitlements. One row per user+component, free or paid. Drives My Downloads + re-download access.';


-- ============================================================
-- 7. REVIEWS  (V2 — modeled now for a future-proof schema)
-- Verified-buyer reviews: rating + text. Enforce "verified" in app/RLS
-- by requiring a matching downloads/purchases row.
-- ============================================================
create table reviews (
    id            uuid primary key default gen_random_uuid(),
    component_id  uuid not null references components(id) on delete cascade,
    buyer_id      uuid not null references profiles(id) on delete cascade,
    rating        integer not null check (rating between 1 and 5),
    body          text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (component_id, buyer_id)                 -- one review per buyer per component
);


-- ============================================================
-- 8. COMMENTS  (V2 — open comments + seller replies)
-- parent_id enables one level of threading (seller replying to a comment).
-- ============================================================
create table comments (
    id            uuid primary key default gen_random_uuid(),
    component_id  uuid not null references components(id) on delete cascade,
    user_id       uuid not null references profiles(id) on delete cascade,
    parent_id     uuid references comments(id) on delete cascade,
    body          text not null,
    created_at    timestamptz not null default now()
);


-- ============================================================
-- 9. INDEXES
-- ============================================================
-- Search + discovery
create index components_search_idx   on components using gin (search_tsv);
create index components_ecosystems_idx on components using gin (ecosystems);
create index components_seller_idx   on components (seller_id);
create index components_status_idx   on components (status);
-- Default sorts on Browse page
create index components_created_idx   on components (created_at desc);
create index components_downloads_idx on components (download_count desc);
create index components_stars_idx     on components (star_count desc);

-- Join / lookup helpers
create index component_tags_tag_idx  on component_tags (tag_id);
create index stars_component_idx     on stars (component_id);
create index purchases_buyer_idx     on purchases (buyer_id);
create index purchases_component_idx on purchases (component_id);
create index downloads_user_idx      on downloads (user_id);
create index reviews_component_idx   on reviews (component_id);
create index comments_component_idx  on comments (component_id);


-- ============================================================
-- 10. TRIGGERS
-- ============================================================

-- 10a. Keep updated_at fresh on row updates.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated   before update on profiles
    for each row execute function set_updated_at();
create trigger trg_components_updated  before update on components
    for each row execute function set_updated_at();
create trigger trg_purchases_updated   before update on purchases
    for each row execute function set_updated_at();
create trigger trg_reviews_updated     before update on reviews
    for each row execute function set_updated_at();

-- 10b. Maintain components.star_count automatically.
create or replace function bump_star_count()
returns trigger language plpgsql as $$
begin
    if (tg_op = 'INSERT') then
        update components set star_count = star_count + 1 where id = new.component_id;
    elsif (tg_op = 'DELETE') then
        update components set star_count = star_count - 1 where id = old.component_id;
    end if;
    return null;
end;
$$;

create trigger trg_stars_count
    after insert or delete on stars
    for each row execute function bump_star_count();

-- 10c. Maintain components.download_count when a library entry is created.
create or replace function bump_download_count()
returns trigger language plpgsql as $$
begin
    update components set download_count = download_count + 1 where id = new.component_id;
    return null;
end;
$$;

create trigger trg_downloads_count
    after insert on downloads
    for each row execute function bump_download_count();


-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS) — high-level notes
-- ============================================================
-- Supabase strongly recommends enabling RLS on every table.
-- With Clerk, configure Clerk to issue a Supabase-compatible JWT so that
-- auth.jwt() ->> 'sub' returns the clerk_user_id inside policies.
--
-- The critical security rule for the paywall:
--   * NEVER expose components.zip_path publicly.
--   * Generate a signed Storage URL from a server-side API route ONLY after
--     confirming the requester has a matching row in `downloads`
--     (free) or a `purchases` row with status='succeeded' (paid).
--
-- Suggested policy shape (enable + write policies per table):
--   alter table components enable row level security;
--   -- public can read published components:
--   create policy "read published" on components
--     for select using (status = 'published');
--   -- only the owner can insert/update their components:
--   create policy "owner writes" on components
--     for all using (
--       seller_id = (select id from profiles
--                    where clerk_user_id = auth.jwt() ->> 'sub')
--     );
--
-- Repeat the pattern for stars/downloads/reviews/comments (a user may only
-- write rows where the user_id/buyer_id resolves to their own profile).
-- ============================================================

-- End of schema.
