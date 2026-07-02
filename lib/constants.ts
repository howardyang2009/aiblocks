// Shared, non-secret constants used on both client and server.
// The bucket name isn't sensitive; the server may override via env.
export const ZIP_BUCKET = "component-zips";
export const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10MB

// Maximum character length for user-generated text bodies (comments, reviews,
// seller replies). Mirrored by DB CHECK constraints in migration 0004.
export const MAX_BODY_LENGTH = 2000;

// Columns fetched for component summary cards (browse, search, seller profile,
// downloads library). Matches the ComponentSummary type in types/database.ts.
export const COMPONENT_SUMMARY_COLS =
  "id, name, description, ecosystems, price_cents, currency, star_count, download_count" as const;
