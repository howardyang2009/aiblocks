import Stripe from "stripe";

// Server-only Stripe client. Lazily constructed so importing this module
// never throws at build time when the key is absent.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing. Check .env.local.");
  _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  return _stripe;
}
