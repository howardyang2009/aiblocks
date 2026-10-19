import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LegalSection as Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Impressum — AiBlocks",
  description: "AiBlocks 依据 § 5 DDG 公布的法律信息（Impressum）。",
};

export const lastUpdated = "2026-10-19";

// Legal notice required for German-operated sites (§ 5 DDG, § 18 Abs. 2 MStV).
// Operator details must stay in sync with the Contact page.
export default function ImpressumContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">RheinWeg 出品的 AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Impressum</h1>
      <p className="text-muted mt-3 text-sm">依据 § 5 DDG 公布的法律信息。</p>
      {notices}

      <Section id="operator" title="运营者">
        <address className="not-italic text-ink">
          Liying Zhu<br />
          Im Rosengärtchen 70<br />
          61440 Oberursel (Taunus)<br />
          德国
        </address>
      </Section>

      <Section id="contact" title="联系方式">
        <p>
          邮箱：{" "}
          <a href="mailto:rheinwegde@gmail.com" className="text-accent hover:underline">
            rheinwegde@gmail.com
          </a>
          <br />
          电话：{" "}
          <a href="tel:+491601168307" className="text-accent hover:underline">
            +49 160 1168307
          </a>
        </p>
      </Section>

      <Section id="responsible" title="内容负责人（§ 18 Abs. 2 MStV）">
        <p>Liying Zhu，地址同上。</p>
      </Section>

      <Section id="disputes" title="消费者争议解决">
        <p>
          我们既无意愿也无义务参加消费者仲裁机构的争议解决程序（§ 36 VSBG）。
        </p>
      </Section>
    </div>
  );
}
