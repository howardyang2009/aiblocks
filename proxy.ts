import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { localeFromPathname, localePrefix, routing } from "./i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

// Protect the dashboard under every Locale prefix. An unprefixed /dashboard
// is only a doorway: the intl step redirects it to a prefixed URL, which is
// then protected here. Public pages, component pages, and seller profiles
// stay open (SSR + SEO). API routes do their own auth checks.
const isProtected = createRouteMatcher(["/:locale/dashboard(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    // API routes and the Stripe webhook have no Locale: never redirect them.
    if (isApi(req)) return;
    if (isProtected(req)) await auth.protect();
    return handleI18nRouting(req);
  },
  // Send signed-out visitors to the sign-in page of the Locale they are on.
  (req) => {
    const prefix = localePrefix(localeFromPathname(req.nextUrl.pathname) ?? routing.defaultLocale);
    return { signInUrl: `${prefix}/sign-in`, signUpUrl: `${prefix}/sign-up` };
  }
);

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
