import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, IntlErrorCode } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Messages {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Fills keys missing from `target` with the `en` Source copy.
function withFallback(source: Messages, target: Messages): Messages {
  const merged: Messages = { ...source };
  for (const [key, value] of Object.entries(target)) {
    merged[key] = isPlainObject(value) && isPlainObject(source[key]) ? withFallback(source[key], value) : value;
  }
  return merged;
}

async function loadMessages(locale: string): Promise<Messages> {
  return (await import(`../messages/${locale}.json`)).default;
}

// Missing keys throw in dev and test (so Playwright catches them too); in
// production they fall back to the `en` Source copy (#44).
const strict = process.env.NODE_ENV !== "production";

export default getRequestConfig(async ({ locale: override }) => {
  let locale = override;
  if (!locale) {
    const segment = await rootParams.locale();
    if (!hasLocale(routing.locales, segment)) notFound();
    locale = segment;
  }

  const messages = await loadMessages(locale);

  return {
    locale,
    messages: strict || locale === "en" ? messages : withFallback(await loadMessages("en"), messages),
    onError(error) {
      if (strict && error.code === IntlErrorCode.MISSING_MESSAGE) throw error;
      console.error(error);
    },
  };
});
