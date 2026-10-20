-- ============================================================
-- 0007_currency_eur.sql
-- ============================================================
-- Every Component is priced in EUR (ADR 0005, issue #66). Existing
-- Components keep the same number (5.00 USD becomes 5.00 EUR). The
-- currency column stays, constrained to 'eur', so a second currency
-- later is a constraint change, not a schema change.
--
-- purchases is NOT touched: a Purchase keeps the currency actually
-- charged, and a pending USD Checkout settles in USD.
-- ============================================================

update components set currency = 'eur' where currency <> 'eur';

alter table components alter column currency set default 'eur';

alter table components
  add constraint components_currency_eur check (currency = 'eur');

-- End of 0007.
