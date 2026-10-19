import { useLocale, useTranslations } from "next-intl";
import { formatPrice, isFreeComponent } from "@/lib/utils";

// A Component's Price in the page's Locale, or the translated Free label.
export function Price({ cents, currency }: { cents: number; currency: string }) {
  const t = useTranslations("Price");
  const locale = useLocale();
  return <>{isFreeComponent(cents) ? t("free") : formatPrice(cents, currency, locale)}</>;
}
