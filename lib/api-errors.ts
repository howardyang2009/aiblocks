// The error keys the shared API helpers (withAuth, parseBody) return, so
// every route's 401 and 400 can be shown in the Viewer's Locale. API routes
// have no Locale (ADR 0003): they send the key, and the client translates
// it from messages/*.json (ApiErrors) via lib/use-error-message.ts.
export const API_ERRORS = ["signInRequired", "invalidBody"] as const;

export type ApiError = (typeof API_ERRORS)[number];

export function isApiError(error: string): error is ApiError {
  return (API_ERRORS as readonly string[]).includes(error);
}
