# Every Component is priced in euros

The marketplace has one currency: EUR. Every Component's Price is in euros, and a Locale never converts it: `de`, `en` and `zh-CN` show the same amount in the same currency, and only the number format follows the Locale (`12,50 €` in `de`, `€12.50` in `en` and `zh-CN`). The operator is in Germany, Buyers are addressed under EU consumer law (see the Withdrawal waiver), and one currency keeps Checkout, Seller payouts and tax simple.

The schema was built multi-currency (`components.currency`, `purchases.currency`) and launched with `usd` as the default. The switch keeps the `currency` columns: `components.currency` defaults to `'eur'` and is constrained to `'eur'`, so a second currency later is a constraint change, not a schema change. The six paid Components live at the time of the switch keep the same number (`$5` becomes `€5`); no Seller was notified.

**Considered Options:** Keeping USD was rejected because it suits neither the operator nor the EU audience. Letting each Seller pick a currency was rejected: it adds per-currency formatting, tax and payout cases for a parked, light-touch marketplace. Converting each price per Locale was rejected because a Buyer must pay the amount shown, and Checkout charges one currency. Dropping `components.currency` entirely was rejected because the column costs nothing and keeps a later second currency cheap.

**Consequences:**
- Purchases are history and keep the currency actually charged: the Purchases made before the switch stay `usd`, and a Checkout begun in USD before the switch settles in USD. Code that formats a Purchase amount must use that Purchase's own currency, not assume EUR.
- Lifting the `'eur'` constraint later needs a currency choice on the Seller form, per-currency display, and a review of Stripe Connect payouts.
