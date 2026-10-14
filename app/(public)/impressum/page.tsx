import type { Metadata } from "next";
import { LegalSection as Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Impressum — AiBlocks",
  description: "Legal notice (Impressum) for AiBlocks, as required by § 5 DDG.",
};

// Legal notice required for German-operated sites (§ 5 DDG, § 18 Abs. 2 MStV).
// Operator details must stay in sync with the Contact page.
export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks by RheinWeg</p>
      <h1 className="font-display font-bold text-3xl mt-2">Impressum</h1>
      <p className="text-muted mt-3 text-sm">Legal notice pursuant to § 5 DDG.</p>

      <Section id="operator" title="Operator">
        <address className="not-italic text-ink">
          Liying Zhu<br />
          Im Rosengärtchen 70<br />
          61440 Oberursel (Taunus)<br />
          Germany
        </address>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Email:{" "}
          <a href="mailto:rheinwegde@gmail.com" className="text-accent hover:underline">
            rheinwegde@gmail.com
          </a>
          <br />
          Phone:{" "}
          <a href="tel:+491601168307" className="text-accent hover:underline">
            +49 160 1168307
          </a>
        </p>
      </Section>

      <Section id="responsible" title="Responsible for content (§ 18 Abs. 2 MStV)">
        <p>Liying Zhu, address as above.</p>
      </Section>

      <Section id="disputes" title="Consumer dispute resolution">
        <p>
          We are neither willing nor obliged to participate in dispute resolution
          proceedings before a consumer arbitration board (§ 36 VSBG).
        </p>
      </Section>
    </div>
  );
}
