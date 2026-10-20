import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { listSitemapTargets, sitemapEntries, type SitemapDb } from "@/lib/seo";

// Lists live Components and Sellers. Served from the CDN and rebuilt in the
// background at most hourly (ISR), so a crawler never waits on Supabase; a
// new Component shows up here within the hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await listSitemapTargets(narrowDb<SitemapDb>(createServiceClient())));
}
