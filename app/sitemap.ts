import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { listSitemapTargets, sitemapEntries, type SitemapDb } from "@/lib/seo";

// Lists live Components and Sellers, so it is built per request, not at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await listSitemapTargets(narrowDb<SitemapDb>(createServiceClient())));
}
