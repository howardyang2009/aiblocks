import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LegalSection as Section, LegalToc } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen — AiBlocks",
  description: "Die Bedingungen für den Kauf und Verkauf von Komponenten auf AiBlocks.",
};

export const lastUpdated = "2026-10-19";

// Drafted by Claude; stays a draft until the lawyer review is done (ADR 0004).
export const draft = true;

const sections = [
  { id: "acceptance", label: "1. Geltung der AGB" },
  { id: "service", label: "2. Was AiBlocks ist" },
  { id: "accounts", label: "3. Voraussetzungen und Konten" },
  { id: "sellers", label: "4. Veröffentlichen von Komponenten" },
  { id: "buyers", label: "5. Kauf und Nutzung von Komponenten" },
  { id: "payments", label: "6. Zahlungen, Gebühren und Stripe Connect" },
  { id: "refunds", label: "7. Erstattungen und Widerrufsrecht" },
  { id: "no-curation", label: "8. Keine Kuratierung: Nutzung auf eigenes Risiko" },
  { id: "reviews", label: "9. Bewertungen, Sterne und Kommentare" },
  { id: "prohibited", label: "10. Verbotene Nutzungen" },
  { id: "ip", label: "11. Geistiges Eigentum und Urheberrechtsbeschwerden" },
  { id: "termination", label: "12. Kündigung" },
  { id: "disclaimers", label: "13. Gewährleistungsausschluss" },
  { id: "liability", label: "14. Haftungsbeschränkung" },
  { id: "indemnification", label: "15. Freistellung" },
  { id: "changes", label: "16. Änderungen dieser AGB" },
  { id: "law", label: "17. Anwendbares Recht, Vertragssprache und Streitigkeiten" },
  { id: "contact", label: "18. Kontakt" },
];

export default function TermsContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Allgemeine Geschäftsbedingungen</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        Diese AGB regeln Ihre Nutzung von AiBlocks, einem Marktplatz, auf dem
        Verkäufer wiederverwendbare KI-Komponenten veröffentlichen (Prompts,
        Skills, Agenten, MCP-Server, CLAUDE.md-Konfigurationen, Hooks und
        ähnliche Bausteine) und Käufer sie finden, herunterladen und bezahlen.
        Mit dem Anlegen eines Kontos, dem Veröffentlichen oder dem Kauf einer
        Komponente stimmen Sie diesen AGB zu.
      </p>
      {notices}

      <LegalToc sections={sections} />

      <Section id="acceptance" title="1. Geltung der AGB">
        <p>
          AiBlocks („AiBlocks“, „wir“, „uns“) wird betrieben von{" "}
          <strong className="text-ink">RheinWeg</strong>. Diese AGB bilden
          zusammen mit unserer{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Datenschutzerklärung
          </Link>{" "}
          die Vereinbarung zwischen Ihnen und AiBlocks. Wenn Sie nicht
          einverstanden sind, nutzen Sie die Plattform bitte nicht.
        </p>
      </Section>

      <Section id="service" title="2. Was AiBlocks ist">
        <p>
          AiBlocks ist ein offener Marktplatz für mehrere Ökosysteme, der
          Menschen, die wiederverwendbare KI-Komponenten bauen, mit Menschen
          verbindet, die sie nutzen möchten. Wir hosten Angebote, wickeln
          Zahlungen über Stripe Connect ab und stellen Werkzeuge zum Finden
          bereit (Suche, Tags, Sterne). Wir sind{" "}
          <strong className="text-ink">Vermittler</strong>, nicht Herausgeber,
          Urheber oder Garant der auf der Plattform angebotenen Komponenten.
          Komponenten werden von einzelnen Verkäufern erstellt und gehören
          ihnen, nicht AiBlocks.
        </p>
      </Section>

      <Section id="accounts" title="3. Voraussetzungen und Konten">
        <ul className="list-disc pl-5 space-y-1">
          <li>Um ein Konto anzulegen oder auf AiBlocks Geschäfte abzuschließen, müssen Sie mindestens 18 Jahre alt oder in Ihrem Land volljährig sein.</li>
          <li>Die Anmeldung erfolgt über Clerk. Sie sind dafür verantwortlich, Ihre Anmeldemethode sicher zu halten, und für alle Aktivitäten unter Ihrem Konto.</li>
          <li>Ein Konto pro Person. Konten sind nicht übertragbar.</li>
          <li>Sie verpflichten sich, zutreffende Angaben zu machen, auch bei der Einrichtung von Auszahlungen für Verkäufer über Stripe Connect.</li>
        </ul>
      </Section>

      <Section id="sellers" title="4. Veröffentlichen von Komponenten">
        <p>Als Verkäufer bestätigen Sie mit dem Veröffentlichen einer Komponente, dass:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sie Inhaber der Komponente sind oder sie verbreiten dürfen und sie keine Schutzrechte Dritter verletzt;</li>
          <li>sie keine Schadsoftware, keine Geheimnisse oder Zugangsdaten Dritter und nichts enthält, das die Systeme schädigen soll, auf denen sie läuft;</li>
          <li>ihre Beschreibung, ihre Ökosystem-Tags und ihre README zutreffend wiedergeben, was sie tut.</li>
        </ul>
        <p>
          Sie bleiben Inhaber Ihrer Komponente. Mit dem Veröffentlichen
          räumen Sie AiBlocks ein nicht ausschließliches, weltweites Recht
          ein, sie über die Plattform zu hosten, anzuzeigen und zu verbreiten,
          und zwar ausschließlich zum Betrieb des Marktplatzes (Anzeige des
          Angebots, Darstellung der README, Auslieferung der ZIP-Datei an
          zahlende bzw. berechtigte Käufer). Dieses Recht endet, wenn Sie die
          Veröffentlichung zurückziehen, mit Ausnahme von Kopien, die Käufer
          bereits rechtmäßig heruntergeladen haben.
        </p>
        <p>
          AiBlocks verwendet keine Versionierung: Wenn Sie Ihr Angebot
          aktualisieren, ersetzt es die aktuelle Version für alle künftigen
          Downloads. Führen Sie ein Changelog in Ihrer README, wenn Käufer
          wissen müssen, was sich geändert hat.
        </p>
      </Section>

      <Section id="buyers" title="5. Kauf und Nutzung von Komponenten">
        <p>
          Mit dem Download einer kostenlosen oder dem Kauf einer
          kostenpflichtigen Komponente erhalten Sie ein persönliches, nicht
          ausschließliches Recht, sie in Ihren eigenen Projekten zu nutzen,
          gegebenenfalls zu weiteren Bedingungen, die der Verkäufer in der
          README nennt. Sofern das Angebot des Verkäufers nichts anderes
          ausdrücklich erlaubt, dürfen Sie die Komponente selbst nicht als
          eigenständiges Produkt weiterverkaufen, unterlizenzieren oder
          weiterverbreiten.
        </p>
        <p>
          Gekaufte Komponenten können Sie jederzeit erneut über Ihr Dashboard
          herunterladen, gebunden an Ihr Konto und die jeweils aktuelle
          Version des Verkäufers.
        </p>
      </Section>

      <Section id="payments" title="6. Zahlungen, Gebühren und Stripe Connect">
        <ul className="list-disc pl-5 space-y-1">
          <li>Alle Zahlungen werden von Stripe abgewickelt. AiBlocks speichert keine Kartendaten.</li>
          <li>Kostenpflichtige Komponenten laufen über Stripe Connect: Das Geld fließt direkt vom Käufer an den Verkäufer, und AiBlocks erhebt <strong className="text-ink">zum Start 0 % Plattformgebühr</strong>. Wir können künftig mit Vorankündigung an die Verkäufer eine Plattformgebühr einführen.</li>
          <li>Die eigenen Bearbeitungsgebühren von Stripe (derzeit ca. 2,9 % zuzüglich einer festen Gebühr pro Transaktion) werden von der Auszahlung an den Verkäufer abgezogen und nicht gesondert von AiBlocks berechnet.</li>
          <li>Verkäufer sind unabhängige Parteien, keine Angestellten oder Vertreter von AiBlocks, und allein für die Steuern auf ihre Einnahmen über die Plattform verantwortlich.</li>
          <li>Verkäufer müssen das Stripe-Connect-Onboarding (Identität, Auszahlungsdaten) abschließen, bevor sie Erlöse aus kostenpflichtigen Downloads erhalten.</li>
        </ul>
      </Section>

      <Section id="refunds" title="7. Erstattungen und Widerrufsrecht">
        <p>
          Wenn Sie Verbraucher in der EU bzw. im EWR sind, steht Ihnen bei
          einem Vertrag über digitale Inhalte grundsätzlich ein{" "}
          <strong className="text-ink">Widerrufsrecht von 14 Tagen</strong>{" "}
          ab dem Tag des Vertragsschlusses zu.
        </p>
        <p>
          Bei einer kostenpflichtigen Komponente erlischt dieses Recht mit
          Beginn des Downloads, wenn Sie vor der Zahlung ausdrücklich
          zugestimmt haben, dass mit der Ausführung des Vertrags vor Ablauf
          der Widerrufsfrist begonnen wird, und Ihre Kenntnis davon bestätigt
          haben, dass Sie dadurch Ihr Widerrufsrecht verlieren (§ 356 Abs. 5
          BGB). AiBlocks holt diese Zustimmung und Bestätigung im
          Bezahlvorgang ein; ohne sie kann kein kostenpflichtiger Download
          beginnen. Bei kostenlosen Komponenten fällt keine Zahlung an, daher
          entsteht kein Widerrufsrecht.
        </p>
        <p>
          Ihre gesetzlichen Rechte, wenn eine Komponente wesentlich von ihrem
          Angebot abweicht (z. B. nicht funktioniert oder nicht dem
          Beschriebenen entspricht), bleiben unberührt. Wenden Sie sich dazu
          über den Kontakt unten an uns.
        </p>
      </Section>

      <Section id="no-curation" title="8. Keine Kuratierung: Nutzung auf eigenes Risiko">
        <p>
          AiBlocks ist <strong className="text-ink">offen für alle</strong>:
          Jeder kann veröffentlichen, und nichts wird von uns geprüft, bevor
          es online geht. Qualitätssignale (Sterne, Downloads, Bewertungen)
          stammen aus der Community und sind keine Sicherheitsgarantie.
        </p>
        <p>
          Viele Komponenten, etwa MCP-Server, Hooks, Skills oder
          CLAUDE.md-Konfigurationen, sind dafür gedacht, ausgeführt zu werden
          oder Zugriff auf Ihre Werkzeuge, Dateien oder Konten zu erhalten.
          Behandeln Sie jede Komponente wie Code von Dritten: Prüfen Sie sie,
          bevor Sie sie ausführen, führen Sie nicht vertrauenswürdige
          Komponenten in einer Sandbox oder mit eingeschränkten Rechten aus
          und geben Sie einer Komponente niemals Zugriff oder Zugangsdaten,
          deren Verlust Sie nicht verkraften können. AiBlocks haftet nicht für
          Schäden, Datenverluste oder unbefugte Zugriffe, die durch das
          Ausführen einer heruntergeladenen Komponente entstehen.
        </p>
      </Section>

      <Section id="reviews" title="9. Bewertungen, Sterne und Kommentare">
        <p>
          Bewertungen müssen auf einem echten, verifizierten Kauf und Ihrer
          ehrlichen Meinung beruhen. Gefälschte Bewertungen, Manipulation von
          Bewertungen (einschließlich Bewertungen eigener Komponenten durch
          Verkäufer) und bezahlte oder belohnte Bewertungen ohne Offenlegung
          sind verboten. Verkäufer dürfen auf Bewertungen und Kommentare
          antworten, aber keine Bewertungen löschen oder unterdrücken, nur
          weil sie anderer Meinung sind.
        </p>
      </Section>

      <Section id="prohibited" title="10. Verbotene Nutzungen">
        <p>Sie dürfen AiBlocks nicht nutzen, um:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Schadsoftware, Ransomware oder etwas zu veröffentlichen, das Daten abgreifen oder ein System schädigen soll;</li>
          <li>Inhalte zu veröffentlichen, die Urheber-, Marken- oder andere Schutzrechte verletzen;</li>
          <li>rechtswidrige Inhalte zu veröffentlichen oder solche, die rechtswidrige Handlungen erleichtern;</li>
          <li>die Plattform über die übliche Nutzung hinaus auszulesen, massenhaft herunterzuladen oder zurückzuentwickeln;</li>
          <li>andere Nutzer oder Verkäufer zu belästigen, zu betrügen oder sich als sie auszugeben;</li>
          <li>die Bezahlschranke oder die Download-Sperre für kostenpflichtige Komponenten zu umgehen.</li>
        </ul>
      </Section>

      <Section id="ip" title="11. Geistiges Eigentum und Urheberrechtsbeschwerden">
        <p>
          Wenn Sie der Ansicht sind, dass eine auf AiBlocks angebotene
          Komponente Ihr Urheberrecht oder andere Schutzrechte verletzt,
          wenden Sie sich an uns (Abschnitt 18) mit einer Beschreibung des
          Werks, der URL des verletzenden Angebots und Ihren Kontaktdaten. Wir
          prüfen den Fall und entfernen verletzende Angebote nach Maßgabe des
          anwendbaren Rechts (z. B. dem DMCA in den USA).
        </p>
      </Section>

      <Section id="termination" title="12. Kündigung">
        <p>
          Sie können Ihr Konto jederzeit löschen. Wir können Konten sperren
          oder kündigen oder Angebote entfernen, die gegen diese AGB
          verstoßen; wo möglich, nennen wir Ihnen den Grund. Käufe, die vor
          der Kündigung abgeschlossen wurden, werden nicht automatisch
          erstattet (siehe Abschnitt 7).
        </p>
      </Section>

      <Section id="disclaimers" title="13. Gewährleistungsausschluss">
        <p>
          AiBlocks und alle Komponenten werden{" "}
          <strong className="text-ink">„wie besehen“</strong> und{" "}
          <strong className="text-ink">„wie verfügbar“</strong> bereitgestellt,
          ohne ausdrückliche oder stillschweigende Gewährleistung jeglicher
          Art, einschließlich der Marktgängigkeit, der Eignung für einen
          bestimmten Zweck und der Nichtverletzung von Rechten Dritter. Wir
          gewährleisten nicht, dass Komponenten fehlerfrei, sicher oder mit
          einem bestimmten KI-Ökosystem (Claude, GPT, Gemini, Deepseek oder
          anderen) kompatibel sind, soweit der Verkäufer dies nicht im Angebot
          angibt.
        </p>
      </Section>

      <Section id="liability" title="14. Haftungsbeschränkung">
        <p>
          Soweit gesetzlich zulässig, haftet AiBlocks nicht für indirekte,
          zufällige oder Folgeschäden und nicht für Verluste aus einer
          Komponente, die Sie heruntergeladen oder ausgeführt haben,
          einschließlich Datenverlust oder unbefugtem Systemzugriff. Unsere
          Gesamthaftung für Ansprüche im Zusammenhang mit der Plattform ist
          auf den höheren Betrag aus dem, was Sie in den 12 Monaten vor dem
          Anspruch an AiBlocks gezahlt haben, und [Betrag, z. B. 100 €]
          beschränkt, außer wo eine solche Beschränkung gesetzlich nicht
          zulässig ist (einschließlich bestimmter zwingender
          Verbraucherschutzvorschriften).
        </p>
      </Section>

      <Section id="indemnification" title="15. Freistellung">
        <p>
          Sie stellen AiBlocks von Ansprüchen frei, die sich aus Ihren Inhalten
          (als Verkäufer), Ihrer Nutzung einer Komponente (als Käufer) oder
          Ihrem Verstoß gegen diese AGB ergeben.
        </p>
      </Section>

      <Section id="changes" title="16. Änderungen dieser AGB">
        <p>
          Wir können diese AGB anpassen, wenn sich die Plattform
          weiterentwickelt. Wesentliche Änderungen (z. B. die Einführung einer
          Plattformgebühr) kündigen wir mit angemessener Frist an. Wenn Sie
          AiBlocks nach Inkrafttreten der Änderungen weiter nutzen, gelten
          die aktualisierten AGB als angenommen.
        </p>
      </Section>

      <Section id="law" title="17. Anwendbares Recht, Vertragssprache und Streitigkeiten">
        <p>
          Für diese AGB gilt deutsches Recht unter Ausschluss der
          Kollisionsnormen; für Streitigkeiten sind die Gerichte in
          Deutschland zuständig. Wenn Sie Verbraucher in der EU bzw. im EWR
          oder in einem anderen Land mit zwingendem Verbraucherschutz sind,
          entzieht Ihnen diese Rechtswahl nicht den Schutz, der Ihnen nach dem
          Recht Ihres Heimatlandes zusteht.
        </p>
        <p>
          Die Vertragssprache ist <strong className="text-ink">Deutsch</strong>.
          Diese AGB werden zusätzlich auf Englisch und in vereinfachtem
          Chinesisch als Übersetzungen zur Information angeboten; verbindlich
          ist allein die deutsche Fassung, und sie geht bei Abweichungen vor.
        </p>
      </Section>

      <Section id="contact" title="18. Kontakt">
        <p>
          Fragen zu diesen AGB, Urheberrechtsbeschwerden oder
          Erstattungsanfragen:{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink">
            Kontaktieren Sie uns hier
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
