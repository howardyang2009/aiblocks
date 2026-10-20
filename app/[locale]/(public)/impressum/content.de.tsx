import type { ReactNode } from "react";
import { LegalSection as Section } from "@/components/legal/legal-page";

export const lastUpdated = "2026-10-19";

// Drafted by Claude; stays a draft until the operator has checked it (ADR 0004).
export const draft = true;

// Legal notice required for German-operated sites (§ 5 DDG, § 18 Abs. 2 MStV).
// Operator details must stay in sync with the Contact page.
export default function ImpressumContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks von RheinWeg</p>
      <h1 className="font-display font-bold text-3xl mt-2">Impressum</h1>
      <p className="text-muted mt-3 text-sm">Angaben gemäß § 5 DDG.</p>
      {notices}

      <Section id="operator" title="Anbieter">
        <address className="not-italic text-ink">
          Liying Zhu<br />
          Im Rosengärtchen 70<br />
          61440 Oberursel (Taunus)<br />
          Deutschland
        </address>
      </Section>

      <Section id="contact" title="Kontakt">
        <p>
          E-Mail:{" "}
          <a href="mailto:rheinwegde@gmail.com" className="text-accent hover:underline">
            rheinwegde@gmail.com
          </a>
          <br />
          Telefon:{" "}
          <a href="tel:+491601168307" className="text-accent hover:underline">
            +49 160 1168307
          </a>
        </p>
      </Section>

      <Section id="responsible" title="Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)">
        <p>Liying Zhu, Anschrift wie oben.</p>
      </Section>

      <Section id="disputes" title="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
        </p>
      </Section>
    </div>
  );
}
