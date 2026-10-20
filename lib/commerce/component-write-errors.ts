// Every failure in components-write.ts and the client form flow carries one
// of these keys as its `error`, never English text: the form translates it
// into the Viewer's Locale from messages/*.json (ComponentForm.errors). API
// routes have no Locale (ADR 0003), so they forward the key as-is. No I/O
// here, so the client form can import it.
export const COMPONENT_WRITE_ERRORS = [
  "nameTooShort",
  "descriptionTooShort",
  "priceInvalid",
  "sourceLanguageInvalid",
  "zipRequired",
  "zipTooLarge",
  "uploadPathMismatch",
  "uploadStartFailed",
  "uploadStartNetwork",
  "uploadFailed",
  "uploadNotFound",
  "publishFailed",
  "publishNetwork",
  "publishedTagsFailed",
  "saveFailed",
  "saveNetwork",
  "updatedTagsFailed",
  "notFound",
  "notOwner",
  "translationLocaleInvalid",
  "translationFieldInvalid",
  "translationEmpty",
  "translationSaveFailed",
  "translationNetwork",
  "translationActionFailed",
] as const;

export type ComponentWriteError = (typeof COMPONENT_WRITE_ERRORS)[number];

// The form shows these keys translated. Shared API helper keys (withAuth,
// parseBody) are translated separately, via lib/api-errors.ts.
export function isComponentWriteError(error: string): error is ComponentWriteError {
  return (COMPONENT_WRITE_ERRORS as readonly string[]).includes(error);
}
