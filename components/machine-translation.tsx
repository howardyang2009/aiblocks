"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { SourceLanguage } from "@/lib/translation/source-language";

// ICU select keys cannot hold a hyphen, so zh-CN is `zh` in the message.
const NOTE_LANGUAGE: Record<SourceLanguage, string> = { de: "de", en: "en", "zh-CN": "zh", other: "other" };

/**
 * One field of a Component's Source text on its detail page (ADR 0006). A
 * machine Translation carries a note whose "Show original" swaps the field
 * to its Source text in place; anything else renders as is, unlabelled.
 * Both versions arrive already rendered, so the markdown renderer stays on
 * the server.
 */
export function MachineTranslatedField({
  shown,
  source,
  machineTranslatedFrom,
}: {
  shown: ReactNode;
  source: ReactNode;
  machineTranslatedFrom: SourceLanguage | null;
}) {
  const t = useTranslations("MachineTranslation");
  const [showSource, setShowSource] = useState(false);
  if (!machineTranslatedFrom) return <>{shown}</>;

  return (
    <>
      {showSource ? source : shown}
      <p className="font-mono text-[11px] text-subtle mt-2" data-testid="machine-translation-note">
        {t("note", { language: NOTE_LANGUAGE[machineTranslatedFrom] })} ·{" "}
        <button type="button" className="text-accent hover:underline" onClick={() => setShowSource((v) => !v)}>
          {showSource ? t("showTranslation") : t("showOriginal")}
        </button>
      </p>
    </>
  );
}
