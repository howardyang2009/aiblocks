import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { localeCookie, localeFromPathname, localePrefix, routing } from "./i18n/routing";
import { rememberedLocalePath } from "./i18n/switch-locale";

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
    // A page load whose prefix disagrees with the remembered Locale goes to
    // that Locale instead of rewriting the cookie (back button, bookmarks,
    // links from rheinwegde.de). Background router requests are left alone.
    const dest = req.headers.get("sec-fetch-dest");
    const remembered = rememberedLocalePath(req.nextUrl.pathname, req.cookies.get(localeCookie.name)?.value);
    if (remembered && (dest === null || dest === "document")) {
      const url = req.nextUrl.clone();
      url.pathname = remembered;
      return NextResponse.redirect(url);
    }
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
    // Skip Next internals and static files, run on everything else. The
    // unprefixed /sitemap.xml and /robots.txt must never get a Locale redirect.
    "/((?!_next|sitemap\\.xml$|robots\\.txt$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
