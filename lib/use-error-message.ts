"use client";

import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api-errors";
import { MAX_BODY_LENGTH } from "@/lib/constants";

// Turns an error from runClientAction into text for the Viewer: a shared
// API helper key (lib/api-errors.ts) is translated, anything else is
// already text and shows as it came. `max` fills the length-limit messages
// and is ignored by the rest.
export function useErrorMessage(): (error: string) => string {
  const t = useTranslations("ApiErrors");
  return (error) => (isApiError(error) ? t(error, { max: MAX_BODY_LENGTH }) : error);
}
