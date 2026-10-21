# The Supabase project stays in Ireland

The production Supabase project ("Ai Blocks Project") runs in `eu-west-1` (Ireland), and stays there. Supabase fixes a project's region when the project is created; there is no setting to move it. The Vercel Functions run in `dub1` (Dublin), the Vercel region for AWS `eu-west-1`, so every page's sequential Supabase calls stay inside one region (#83). Ireland is in the EU, so the data stays under GDPR without a move.

**Considered Options:** Moving to Frankfurt (`eu-central-1`) was rejected. It means creating a new project, restoring the database with `pg_dump`/`pg_restore`, copying the Storage buckets (Component zips are not in a database dump), rotating the Supabase URL and keys in Vercel and every `.env` file, and moving `vercel.json` to `fra1`. That costs downtime and risks Purchases, Stars and Reviews, for a few milliseconds of latency to Buyers in Germany.

**Consequences:**
- `vercel.json` keeps `"regions": ["dub1"]`. Changing the Supabase region later means changing the function region with it.
- Revisit only if a customer or law requires data stored in Germany.
