import { deDE, enUS, zhCN } from "@clerk/localizations";
import { localePrefix, type Locale } from "./routing";

// Clerk's UI follows the Viewer's Locale (#40): we hand Clerk its own
// interface strings rather than translating its components ourselves.
const clerkStrings = { de: deDE, en: enUS, "zh-CN": zhCN };

/** ClerkProvider props that keep sign-in, sign-up and sign-out in a Locale. */
export function clerkProviderProps(locale: Locale) {
  const prefix = localePrefix(locale);
  return {
    localization: clerkStrings[locale],
    signInUrl: `${prefix}/sign-in`,
    signUpUrl: `${prefix}/sign-up`,
    afterSignOutUrl: prefix,
    // Used only when the sign-in URL carries no redirect_url.
    signInFallbackRedirectUrl: prefix,
    signUpFallbackRedirectUrl: prefix,
  };
}
