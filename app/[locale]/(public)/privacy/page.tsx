import { getLocale } from "next-intl/server";
import { pageMetadata } from "@/i18n/metadata";
import { LegalNotices, type LegalContent } from "@/components/legal/legal-notices";
import type { Locale } from "@/i18n/routing";
import * as de from "./content.de";
import * as en from "./content.en";
import * as zhCN from "./content.zh-CN";

// `de` is the binding master; `en` and `zh-CN` are translations of it (ADR 0004).
const content: Record<Locale, LegalContent> = { de, en, "zh-CN": zhCN };

export function generateMetadata() {
  return pageMetadata("privacy");
}

export default async function PrivacyPage() {
  const { default: Content } = content[await getLocale()];
  return <Content notices={<LegalNotices kind="privacy" versions={content} />} />;
}
