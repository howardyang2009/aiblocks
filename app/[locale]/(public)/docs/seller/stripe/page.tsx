import { getLocale } from "next-intl/server";
import { pageMetadata } from "@/i18n/metadata";
import type { LocalizedPage } from "@/i18n/page-content";
import * as de from "./content.de";
import * as en from "./content.en";
import * as zhCN from "./content.zh-CN";

const content: LocalizedPage = { de, en, "zh-CN": zhCN };

export function generateMetadata() {
  return pageMetadata("sellerStripeGuide");
}

export default async function StripeGuidePage() {
  const { default: Content } = content[await getLocale()];
  return <Content />;
}
