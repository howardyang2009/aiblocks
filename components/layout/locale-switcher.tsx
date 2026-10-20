"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localeCookie, localePrefix, routing, type Locale } from "@/i18n/routing";
import { switchLocaleHref, type PageLocation } from "@/i18n/switch-locale";

// Each Locale's own name, the same on every page (#42). `中文`, not `简体中文`.
const OWN_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  "zh-CN": "中文",
};

// Footer button plus native modal <dialog>: the browser traps focus, closes it
// on Escape and returns focus to the button. Links are full navigations; a
// click writes the RHEINWEG_LOCALE cookie first, because the middleware sends
// a page whose prefix disagrees with the cookie back to the remembered Locale.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  // Read on open, so the links keep the query string and hash of this page.
  const [here, setHere] = useState<PageLocation | null>(null);

  function open() {
    const { pathname, search, hash } = window.location;
    setHere({ pathname, search, hash });
    dialog.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 text-muted hover:text-ink"
      >
        <GlobeIcon />
        <span className="sr-only">{t("label")}: </span>
        {OWN_NAMES[current]}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="locale-switcher-title"
        className="rounded-block border bg-surface text-ink p-0 w-full max-w-sm m-auto backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="locale-switcher-title" className="font-display font-bold text-lg">{t("title")}</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t("close")}
            className="text-muted hover:text-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        <ul className="py-2">
          {routing.locales.map((locale) => {
            const isCurrent = locale === current;
            return (
              <li key={locale}>
                <a
                  href={here ? switchLocaleHref(here, locale) : localePrefix(locale)}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => rememberLocale(locale)}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-paper"
                >
                  <span className="flex flex-col">
                    <span className={isCurrent ? "font-bold" : undefined}>{OWN_NAMES[locale]}</span>
                    <span lang={current} className="text-sm text-subtle">{t(`names.${locale}`)}</span>
                  </span>
                  {isCurrent && <span aria-hidden="true" className="text-accent">✓</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}

function rememberLocale(locale: Locale) {
  const { name, maxAge, domain } = localeCookie;
  document.cookie = `${name}=${locale}; path=/; max-age=${maxAge}; samesite=lax${domain ? `; domain=${domain}` : ""}`;
}

function GlobeIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3z" />
    </svg>
  );
}
