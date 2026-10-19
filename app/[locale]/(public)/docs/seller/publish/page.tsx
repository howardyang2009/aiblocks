import { getLocale } from "next-intl/server";
import type { LocalizedPage } from "@/i18n/page-content";
import * as de from "./content.de";
import * as en from "./content.en";
import * as zhCN from "./content.zh-CN";

const content: LocalizedPage = { de, en, "zh-CN": zhCN };

export async function generateMetadata() {
  return content[await getLocale()].metadata;
}

export default async function PublishGuidePage() {
  const { default: Content } = content[await getLocale()];
  return <Content />;
}
