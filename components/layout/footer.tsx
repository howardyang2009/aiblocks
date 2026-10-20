import { useTranslations } from "next-intl";
import { RheinWegLogo, RHEINWEG_URL } from "@/components/brand/rheinweg-logo";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t bg-surface mt-16">
      <div className="mx-auto max-w-shell px-5 py-12 grid gap-8 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <RheinWegLogo />
              <span className="font-display font-bold text-lg tracking-tight">AiBlocks</span>
            </Link>
            <a href={RHEINWEG_URL} className="font-mono text-xs text-subtle hover:text-accent">{t("byRheinWeg")}</a>
          </div>
          <p className="font-mono text-xs text-muted mt-3">{t("tagline")}</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">{t("sell")}</span>
          <Link href="/docs/seller/publish" className="text-muted hover:text-ink">{t("publishingGuide")}</Link>
          <Link href="/docs/seller/stripe" className="text-muted hover:text-ink">{t("getPaid")}</Link>
        </nav>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">{t("aboutHeading")}</span>
          <Link href="/about" className="text-muted hover:text-ink">{t("about")}</Link>
          <Link href="/contact" className="text-muted hover:text-ink">{t("contact")}</Link>
          <Link href="/impressum" className="text-muted hover:text-ink">{t("impressum")}</Link>
          <Link href="/terms" className="text-muted hover:text-ink">{t("terms")}</Link>
          <Link href="/privacy" className="text-muted hover:text-ink">{t("privacy")}</Link>
        </nav>

        <div className="text-sm self-start">
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
