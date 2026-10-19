import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto max-w-shell px-5 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
      <Link href="/" className="inline-block mt-6 text-accent hover:underline">
        {t("home")}
      </Link>
    </div>
  );
}
