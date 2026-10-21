// The error keys API routes return when a Viewer can act on the message:
// the shared helpers (withAuth, parseBody), Comments, Reviews, Seller
// replies, Stars, checkout and download. API routes have no Locale (ADR 0003):
// they send the key, and the client translates it from messages/*.json
// (ApiErrors) via lib/use-error-message.ts. Component form errors have
// their own keys (lib/commerce/component-write-errors.ts).
export const API_ERRORS = [
  "signInRequired",
  "invalidBody",
  "componentNotFound",
  "commentRequired",
  "commentTooLong",
  "parentCommentNotFound",
  "replyToReplyNotAllowed",
  "commentPostFailed",
  "commentDeleteFailed",
  "ratingInvalid",
  "reviewTooLong",
  "ownReviewNotAllowed",
  "verifiedBuyerRequired",
  "reviewSaveFailed",
  "reviewDeleteFailed",
  "replyRequired",
  "replyTooLong",
  "reviewNotFound",
  "sellerOnlyReply",
  "replySaveFailed",
  "replyDeleteFailed",
  "componentRequired",
  "waiverRequired",
  "componentIsFree",
  "ownComponentPurchase",
  "alreadyOwned",
  "sellerNotPayable",
  "purchaseCreateFailed",
  "checkoutFailed",
  "componentUnavailable",
  "purchaseRequired",
  "downloadFailed",
  "starSaveFailed",
] as const;

export type ApiError = (typeof API_ERRORS)[number];

export function isApiError(error: string): error is ApiError {
  return (API_ERRORS as readonly string[]).includes(error);
}
