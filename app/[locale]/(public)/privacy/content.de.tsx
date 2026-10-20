import type { ReactNode } from "react";
import { LegalSection as Section, LegalToc } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";

export const lastUpdated = "2026-10-20";

// Drafted by Claude; stays a draft until the lawyer review is done (ADR 0004).
export const draft = true;

const sections = [
  { id: "overview", label: "1. Überblick" },
  { id: "data-we-collect", label: "2. Welche Daten wir erheben" },
  { id: "how-we-use-it", label: "3. Wofür wir sie verwenden" },
  { id: "legal-basis", label: "4. Rechtsgrundlagen der Verarbeitung (DSGVO)" },
  { id: "sharing", label: "5. An wen wir Daten weitergeben" },
  { id: "transfers", label: "6. Übermittlung in Drittländer" },
  { id: "retention", label: "7. Speicherdauer" },
  { id: "your-rights", label: "8. Ihre Rechte" },
  { id: "cookies", label: "9. Cookies und Tracking" },
  { id: "children", label: "10. Kinder" },
  { id: "security", label: "11. Sicherheit" },
  { id: "breach", label: "12. Meldung von Datenschutzverletzungen" },
  { id: "changes", label: "13. Änderungen dieser Erklärung" },
  { id: "contact", label: "14. Kontakt und Verantwortlicher" },
];

export default function PrivacyContent({ notices }: { notices: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">Datenschutzerklärung</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        Hier erklären wir, welche personenbezogenen Daten AiBlocks erhebt,
        wenn Sie den Marktplatz als Käufer oder Verkäufer nutzen, warum wir
        sie erheben, an wen wir sie weitergeben und welche Rechte Sie daran
        haben, einschließlich Ihrer Rechte nach der Datenschutz-Grundverordnung
        der EU (DSGVO).
      </p>
      {notices}

      <LegalToc sections={sections} />

      <Section id="overview" title="1. Überblick">
        <p>
          AiBlocks ist ein Marktplatz für wiederverwendbare KI-Komponenten. Für
          seinen Betrieb verarbeiten wir einige personenbezogene Daten:
          Kontodaten, Kaufdaten und Angaben zu Auszahlungen an Verkäufer. Diese
          Seite deckt all das ab. Sie gilt für Käufer, Verkäufer und alle, die
          die öffentliche Website besuchen.
        </p>
      </Section>

      <Section id="data-we-collect" title="2. Welche Daten wir erheben">
        <p><strong className="text-ink">Kontodaten (über Clerk):</strong> E-Mail-Adresse, Name, Profilbild und grundlegende Profilangaben aus der von Ihnen genutzten Anmeldemethode (Google, Microsoft, Facebook, GitHub oder E-Mail und Passwort).</p>
        <p><strong className="text-ink">Verkäuferdaten:</strong> Anzeigename, Bio und Links, die Sie Ihrem öffentlichen Verkäuferprofil hinzufügen; Status des Stripe-Connect-Onboardings (Identitätsprüfung und Auszahlungsdaten werden direkt von Stripe erhoben und gespeichert; AiBlocks sieht und speichert Ihre Bankdaten nicht).</p>
        <p><strong className="text-ink">Transaktionsdaten:</strong> welche Komponenten Sie gekauft oder veröffentlicht haben, Kaufbeträge und Zeitpunkte, Download-Verlauf, Sterne sowie Ihre Bewertungen und Kommentare.</p>
        <p><strong className="text-ink">Hochgeladene Inhalte:</strong> ZIP-Dateien und Markdown-READMEs der Komponenten, die Sie als Verkäufer veröffentlichen.</p>
        <p><strong className="text-ink">Technische Daten:</strong> übliche Server-Logs (IP-Adresse, Zeitstempel, Metadaten der Anfrage), die unser Hosting-Anbieter (Vercel) für Betrieb und Absicherung der Website automatisch erfasst.</p>
      </Section>

      <Section id="how-we-use-it" title="3. Wofür wir sie verwenden">
        <ul className="list-disc pl-5 space-y-1">
          <li>um Ihr Konto anzulegen und abzusichern und Ihnen die Anmeldung zu ermöglichen</li>
          <li>um Käufe abzuwickeln und Auszahlungen an Verkäufer über Stripe Connect zu leiten</li>
          <li>um Beschreibung und README einer Komponente maschinell in die anderen Sprachen der Website zu übersetzen</li>
          <li>um Ihr öffentliches Verkäuferprofil und Ihre veröffentlichten Komponenten anzuzeigen</li>
          <li>um kostenpflichtige Downloads nur Käufern freizugeben, die tatsächlich bezahlt haben</li>
          <li>um Supportanfragen zu beantworten und die AGB durchzusetzen</li>
          <li>um gesetzliche Pflichten zu erfüllen (z. B. steuerliche und handelsrechtliche Aufbewahrung)</li>
        </ul>
        <p>Wir verkaufen Ihre personenbezogenen Daten nicht und nutzen sie nicht für Werbung.</p>
      </Section>

      <Section id="legal-basis" title="4. Rechtsgrundlagen der Verarbeitung (DSGVO)">
        <p>Für Nutzer in der EU bzw. im EWR stützen wir jede der oben genannten Verwendungen auf eine dieser Rechtsgrundlagen:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Vertrag</strong> (Art. 6 Abs. 1 lit. b DSGVO): Verarbeitung, die nötig ist, um Ihr Konto anzulegen, einen Kauf abzuschließen oder einen Verkäufer auszuzahlen.</li>
          <li><strong className="text-ink">Rechtliche Verpflichtung</strong> (Art. 6 Abs. 1 lit. c DSGVO): Aufbewahrung nach Steuer- und Handelsrecht.</li>
          <li><strong className="text-ink">Berechtigtes Interesse</strong> (Art. 6 Abs. 1 lit. f DSGVO): Schutz der Plattform vor Betrug und Missbrauch sowie Betrieb der Kernfunktionen der Website.</li>
          <li><strong className="text-ink">Einwilligung</strong> (Art. 6 Abs. 1 lit. a DSGVO): alles Optionale, das wir später hinzufügen könnten (z. B. Marketing-E-Mails); dafür würden wir Sie gesondert um Ihre Einwilligung bitten.</li>
        </ul>
      </Section>

      <Section id="sharing" title="5. An wen wir Daten weitergeben">
        <p>
          Wir geben Daten an die Dienstleister („Auftragsverarbeiter“) weiter,
          die die Plattform betreiben, und zwar nur, soweit sie diese für ihre
          Leistung an uns benötigen, nicht für eigene Zwecke:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Clerk</strong>: Anmeldung und Kontoverwaltung.</li>
          <li><strong className="text-ink">Supabase</strong>: Datenbank und Dateispeicher (Komponenten-ZIPs, Metadaten).</li>
          <li><strong className="text-ink">Stripe</strong> (Stripe Connect): Zahlungsabwicklung, Identitätsprüfung der Verkäufer (KYC) und Auszahlungen. Stripe speichert Ihre Zahlungs- und Bankdaten direkt; vollständige Kartennummern sehen wir nie.</li>
          <li><strong className="text-ink">Vercel</strong>: Hosting der Anwendung und Server-Logs.</li>
          <li><strong className="text-ink">Anthropic</strong> (Claude): maschinelle Übersetzung der von Verkäufern eingereichten Komponententexte (Beschreibung und README) in die anderen Sprachen der Website.</li>
        </ul>
        <p>
          Ihr öffentliches Verkäuferprofil (Name, Bio, Links, veröffentlichte
          Komponenten, Statistiken) ist für alle Besucher von AiBlocks
          sichtbar. Diese Sichtbarkeit ist der Zweck eines öffentlichen
          Profils, keine Nebenwirkung einer Datenweitergabe. Darüber hinaus
          geben wir Ihre Daten nicht an andere Nutzer weiter, außer was ein
          Kauf selbst offenlegt (z. B. sieht ein Verkäufer über Stripe, dass
          ein Verkauf stattgefunden hat).
        </p>
      </Section>

      <Section id="transfers" title="6. Übermittlung in Drittländer">
        <p>
          Clerk, Supabase, Stripe, Vercel und Anthropic können Daten außerhalb Ihres
          Landes verarbeiten, auch in den Vereinigten Staaten. Soweit dies
          Daten aus der EU bzw. dem EWR betrifft, sollten die Übermittlungen
          durch die Standardvertragsklauseln (SCCs) des jeweiligen Anbieters
          oder eine gleichwertige Garantie abgesichert sein. Dies ist anhand
          des aktuellen Auftragsverarbeitungsvertrags (AVV) jedes Anbieters zu
          bestätigen und hier konkret aufzuführen, statt es zu unterstellen.
        </p>
      </Section>

      <Section id="retention" title="7. Speicherdauer">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kontodaten speichern wir, solange Ihr Konto besteht, und löschen oder anonymisieren sie innerhalb eines angemessenen Zeitraums nach der Löschung Ihres Kontos, soweit wir sie nicht länger aufbewahren müssen.</li>
          <li>Transaktions- und Zahlungsdaten (Käufe, Zahlungsdaten von Stripe) werden nach deutschem Steuerrecht (GoBD, § 147 Abgabenordnung) <strong className="text-ink">8 Jahre</strong> aufbewahrt; das Bürokratieentlastungsgesetz IV hat die Frist für Zeiträume ab dem 1. Januar 2025 von 10 auf 8 Jahre verkürzt. Die Frist beginnt mit dem Ende des Kalenderjahres, in dem der Datensatz entstanden ist; ein Kauf aus 2026 wird also bis zum 31. Dezember 2034 aufbewahrt.</li>
          <li>Jahresabschlüsse und Handelsbücher: 10 Jahre.</li>
          <li>Geschäftskorrespondenz zu einer bestimmten Transaktion: 6 Jahre.</li>
          <li>Die Dateien einer veröffentlichten Komponente speichern wir, solange sie auf dem Marktplatz angeboten wird, und für einen angemessenen Zeitraum nach dem Zurückziehen, damit Käufer bereits Gekauftes erneut herunterladen können.</li>
        </ul>
      </Section>

      <Section id="your-rights" title="8. Ihre Rechte">
        <p>Wenn Sie sich in der EU bzw. im EWR (oder in einem Land mit vergleichbarem Schutz) befinden, haben Sie das Recht:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Auskunft über die personenbezogenen Daten zu erhalten, die wir über Sie speichern</li>
          <li>unrichtige Daten berichtigen zu lassen</li>
          <li>die Löschung zu verlangen („Recht auf Vergessenwerden“), vorbehaltlich der oben genannten gesetzlichen Aufbewahrungspflichten</li>
          <li>bestimmte Verarbeitungen einschränken zu lassen oder ihnen zu widersprechen</li>
          <li>Ihre Daten in einem übertragbaren Format zu erhalten</li>
          <li>eine Einwilligung jederzeit zu widerrufen, wenn die Verarbeitung auf einer Einwilligung beruht</li>
          <li>sich bei Ihrer zuständigen Datenschutz-Aufsichtsbehörde zu beschweren</li>
        </ul>
        <p>Um eines dieser Rechte auszuüben, wenden Sie sich an uns über Abschnitt 14.</p>
      </Section>

      <Section id="cookies" title="9. Cookies und Tracking">
        <p>
          AiBlocks verwendet derzeit nur technisch notwendige Cookies, die für
          den Betrieb der Website erforderlich sind:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">Sitzungs-Cookies von Clerk</strong>: halten Sie angemeldet.</li>
          <li><strong className="text-ink"><code>RHEINWEG_LOCALE</code></strong>: merkt sich die Sprache, in der Sie die Website zuletzt angesehen haben, damit die Startseite beim nächsten Besuch in dieser Sprache öffnet. Das Cookie wird mit rheinwegde.de und dessen Subdomains geteilt, damit beide Websites in derselben Sprache öffnen. Es enthält nur den Sprachcode. Speicherdauer: ein Jahr.</li>
        </ul>
        <p>
          Wir setzen derzeit keine Analyse- oder Werbe-Tracker ein. Sollte sich
          das ändern (z. B. durch Produktanalysen), passen wir diese Erklärung
          an und holen, wo erforderlich, vorher Ihre Einwilligung ein.
        </p>
      </Section>

      <Section id="children" title="10. Kinder">
        <p>
          AiBlocks richtet sich nicht an Kinder, und nach unseren AGB müssen
          Sie mindestens 18 Jahre alt (oder in Ihrem Land volljährig) sein, um
          ein Konto anzulegen. Wir erheben wissentlich keine Daten von Kindern.
        </p>
      </Section>

      <Section id="security" title="11. Sicherheit">
        <p>
          Wir schützen Ihre Daten mit angemessenen technischen und
          organisatorischen Maßnahmen: Zugriffskontrollen auf unsere Datenbank,
          verschlüsselte Verbindungen und die Auslagerung der sensibelsten
          Daten (Anmeldedaten, Zahlungsdaten) an Clerk und Stripe, statt sie
          selbst zu verarbeiten. Kein System ist zu 100 % sicher, und absolute
          Sicherheit können wir nicht garantieren. Dieser Abschnitt betrifft{" "}
          <em>Ihr Konto und Ihre Plattformdaten</em>. Zum gesonderten Risiko,
          heruntergeladene Komponenten Dritter auszuführen (ein
          Sicherheitsthema, kein Datenschutzthema), siehe Abschnitt 8 der AGB.
        </p>
      </Section>

      <Section id="breach" title="12. Meldung von Datenschutzverletzungen">
        <p>
          Kommt es zu einer Verletzung des Schutzes Ihrer personenbezogenen
          Daten, benachrichtigen wir die betroffenen Nutzer und, soweit
          gesetzlich vorgeschrieben, die zuständige Aufsichtsbehörde innerhalb
          der gesetzlichen Frist (nach der DSGVO in der Regel unverzüglich).
        </p>
      </Section>

      <Section id="changes" title="13. Änderungen dieser Erklärung">
        <p>
          Wir können diese Datenschutzerklärung anpassen, wenn sich die
          Plattform weiterentwickelt. Wesentliche Änderungen kündigen wir mit
          angemessener Frist an. Wenn Sie AiBlocks nach Inkrafttreten der
          Änderungen weiter nutzen, gilt die aktualisierte Erklärung als
          angenommen.
        </p>
      </Section>

      <Section id="contact" title="14. Kontakt und Verantwortlicher">
        <p>
          Verantwortlicher für AiBlocks ist{" "}
          <strong className="text-ink">RheinWeg</strong>. Für Fragen zum
          Datenschutz oder um die Rechte aus Abschnitt 8 auszuüben:{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink">
            Kontaktieren Sie uns hier
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
