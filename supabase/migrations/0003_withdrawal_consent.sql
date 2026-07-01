-- ============================================================
-- AiBlocks — EU withdrawal-right consent tracking
-- File: supabase/migrations/0003_withdrawal_consent.sql
-- Run AFTER 0001_init.sql and 0002_rls.sql, in the Supabase SQL editor.
-- ============================================================
--
-- WHY THIS EXISTS
-- ------------------------------------------------------------
-- EU/EEA consumer law (Consumer Rights Directive, Art. 16(m)) gives
-- buyers a 14-day right to withdraw from a purchase of digital content
-- UNLESS they explicitly consented to immediate delivery and
-- acknowledged that doing so waives that right. The consent has to be
-- captured at the point of purchase, not just stated in the Terms.
--
-- These columns record that a given purchase captured that consent,
-- and when — this is the evidence you'd need if a buyer ever disputes
-- a charge or claims they weren't informed. See:
--   - AiBlocks_Terms (Section 7 — Refunds & Withdrawal Rights)
--   - app/api/checkout/route.ts (where this is enforced server-side)
--   - components/download-button.tsx (where the checkbox lives)
-- ============================================================

alter table purchases
  add column if not exists withdrawal_waived    boolean not null default false,
  add column if not exists withdrawal_waived_at timestamptz;

comment on column purchases.withdrawal_waived is
  'True if the buyer explicitly consented to immediate digital delivery and waived their EU/EEA 14-day withdrawal right before this purchase was created. Required by app/api/checkout/route.ts before a Checkout Session is created.';

comment on column purchases.withdrawal_waived_at is
  'Timestamp the consent above was captured, for dispute/audit purposes.';
