import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt — AiBlocks",
  description: "So erreichen Sie AiBlocks.",
};

export default function ContactContent() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Kontakt</h1>
      <p className="text-muted mt-3">
        Fragen, Feedback oder Support: Sie erreichen uns über die folgenden Kontaktdaten.
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <section>
          <p className="eyebrow mb-2">Adresse</p>
          <address className="not-italic text-sm leading-relaxed text-ink">
            Liying Zhu<br />
            Im Rosengärtchen 70<br />
            61440 Oberursel (Taunus)<br />
            Deutschland
          </address>
        </section>

        <section className="space-y-5">
          <div>
            <p className="eyebrow mb-2">E-Mail</p>
            <a href="mailto:rheinwegde@gmail.com" className="text-sm text-accent hover:underline">
              rheinwegde@gmail.com
            </a>
          </div>
          <div>
            <p className="eyebrow mb-2">Telefon</p>
            <a href="tel:+491601168307" className="text-sm text-accent hover:underline">
              +49 160 1168307
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
