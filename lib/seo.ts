import type { Metadata, MetadataRoute } from "next";
import { localeUrl } from "@/i18n/locale-url";
import { routing, type Locale } from "@/i18n/routing";
import { APP_URL } from "@/lib/constants";

// Indexed static content pages with their own `Metadata` messages, by path.
const INDEXED_PAGES = {
  browse: "/browse",
  about: "/about",
  contact: "/contact",
  impressum: "/impressum",
  privacy: "/privacy",
  terms: "/terms",
  sellerPublishGuide: "/docs/seller/publish",
  sellerStripeGuide: "/docs/seller/stripe",
} as const;

// Pages with `Metadata` messages that stay out of the index.
const NOINDEX_PAGES = ["search", "signIn", "signUp"] as const;

export type MetadataPage = keyof typeof INDEXED_PAGES | (typeof NOINDEX_PAGES)[number];

/** Pages with their own title and description in the `Metadata` message namespace. */
export const METADATA_PAGES = [...(Object.keys(INDEXED_PAGES) as MetadataPage[]), ...NOINDEX_PAGES];

// Every indexed static page, home included, for the sitemap (#68).
const STATIC_PAGES = ["", ...Object.values(INDEXED_PAGES)];

/**
 * A page's self-referencing canonical: its absolute URL in its own Locale,
 * never another Locale's. Built from the public prefix (`/zh`), not Next's
 * internal route (`/zh-CN`), which is why the layout cannot set it.
 */
export function canonical(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  return { canonical: localeUrl(locale, path) };
}

/** The canonical, or `noindex`, for a static page in a Locale. */
export function pageSeo(page: MetadataPage, locale: Locale): Metadata {
  return page in INDEXED_PAGES
    ? { alternates: canonical(locale, INDEXED_PAGES[page as keyof typeof INDEXED_PAGES]) }
    : { robots: { index: false } };
}

/** Path of a Component detail page, without the Locale prefix. */
export function componentPath(id: string): string {
  return `/components/${encodeURIComponent(id)}`;
}

/** Path of a Seller page, without the Locale prefix. */
export function sellerPath(username: string): string {
  return `/sellers/${encodeURIComponent(username)}`;
}

/** What the sitemap lists besides the static pages. */
export type SitemapTargets = { componentIds: string[]; sellerUsernames: string[] };

/**
 * Plain prefixed URLs for every indexable page in all three Locales. hreflang
 * comes from next-intl's `Link` headers, so entries carry no `alternates`.
 */
export function sitemapEntries({ componentIds, sellerUsernames }: SitemapTargets): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PAGES,
    ...componentIds.map(componentPath),
    ...sellerUsernames.map(sellerPath),
  ];
  return paths.flatMap((path) => routing.locales.map((locale) => ({ url: localeUrl(locale, path) })));
}

// The narrow slice of the Supabase client listSitemapTargets touches.
export type SitemapDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: { id: string; seller_id: string }[] | null }>;
    };
  };
  from(table: "profiles"): {
    select(columns: string): {
      in(column: string, values: string[]): PromiseLike<{ data: { username: string }[] | null }>;
    };
  };
};

/** Every published Component, and every Seller (a Profile with one or more published Components). */
export async function listSitemapTargets(supabase: SitemapDb): Promise<SitemapTargets> {
  const { data: components } = await supabase.from("components").select("id, seller_id").eq("status", "published");
  const componentIds = (components ?? []).map((c) => c.id);
  const sellerIds = [...new Set((components ?? []).map((c) => c.seller_id))];
  if (!sellerIds.length) return { componentIds, sellerUsernames: [] };

  const { data: sellers } = await supabase.from("profiles").select("username").in("id", sellerIds);
  return { componentIds, sellerUsernames: (sellers ?? []).map((s) => s.username) };
}

/** robots.txt: keep crawlers out of the API and every Locale's dashboard. */
export function robotsRules(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/*/dashboard"] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

const DESCRIPTION_MAX = 160;

/**
 * A meta description of at most 160 characters: whitespace collapsed, cut at
 * the last word boundary (or hard-cut for text without spaces) and marked "…".
 */
export function truncateDescription(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= DESCRIPTION_MAX) return flat;
  const head = flat.slice(0, DESCRIPTION_MAX);
  const space = head.lastIndexOf(" ");
  return (space > 0 ? head.slice(0, space) : head.slice(0, DESCRIPTION_MAX - 1)) + "…";
}
