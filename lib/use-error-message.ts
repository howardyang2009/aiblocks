"use client";

import { useTranslations } from "next-intl";
import { isApiError } from "@/lib/api-errors";

// Turns an error from runClientAction into text for the Viewer: a shared
// API helper key (lib/api-errors.ts) is translated, anything else is
// already text and shows as it came.
export function useErrorMessage(): (error: string) => string {
  const t = useTranslations("ApiErrors");
  return (error) => (isApiError(error) ? t(error) : error);
}
