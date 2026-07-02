-- ============================================================
-- 0004_review_replies.sql  (V2 — seller replies to reviews)
-- ============================================================
-- One public reply per review, written only by the seller of the
-- reviewed component.
--
-- Why a separate table instead of a seller_reply column on reviews:
-- an RLS policy letting the seller UPDATE rows in `reviews` would
-- also let them change the rating/body if the browser door is ever
-- opened (see AiBlocks_Clerk_Supabase_JWT_Note.md — never loosen
-- policies). A dedicated table keeps reviews immutable by sellers
-- and gives the reply its own clean, narrow policies.
--
-- component_id and seller_id are denormalized from the review so
-- policies and queries don't need joins. The API sets them from the
-- review row server-side; the insert policy re-verifies both.
-- ============================================================

create table review_replies (
    id            uuid primary key default gen_random_uuid(),
    review_id     uuid unique not null references reviews(id) on delete cascade,
    component_id  uuid not null references components(id) on delete cascade,
    seller_id     uuid not null references profiles(id) on delete cascade,
    body          text not null check (char_length(body) between 1 and 2000),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

comment on table review_replies is
  'Seller responses to verified-buyer reviews. unique(review_id) = one reply per review.';

create index review_replies_component_idx on review_replies (component_id);

-- Keep updated_at fresh (same helper as 0001).
create trigger trg_review_replies_updated
    before update on review_replies
    for each row execute function set_updated_at();

-- ============================================================
-- RLS — same shape as the other tables (defense in depth; the
-- server routes remain the enforcement layer today).
-- ============================================================
alter table review_replies enable row level security;

create policy "review_replies: public read"
  on review_replies for select
  using (true);

-- Only the seller of the component may create the reply, and only
-- for a review that actually belongs to that component.
create policy "review_replies: component seller insert"
  on review_replies for insert
  with check (
    seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    and exists (
      select 1 from components c
      where c.id = review_replies.component_id
        and c.seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub')
    )
    and exists (
      select 1 from reviews r
      where r.id = review_replies.review_id
        and r.component_id = review_replies.component_id
    )
  );

create policy "review_replies: author update"
  on review_replies for update
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'))
  with check (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "review_replies: author delete"
  on review_replies for delete
  using (seller_id = (select id from profiles where clerk_user_id = auth.jwt() ->> 'sub'));

-- End of 0004.
