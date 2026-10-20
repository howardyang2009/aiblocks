import { Guide, type GuideStep } from "@/components/guide";
import { screenshotsDe as screenshots } from "./screenshots";
import { Link } from "@/i18n/navigation";

const steps: GuideStep[] = [
  {
    title: "Stripe-Onboarding starten",
    body: "Öffnen Sie angemeldet Ihre Stripe-Seite für Verkäufer /dashboard/seller/stripe und klicken Sie auf „Mit Stripe verbinden“, um das Onboarding Ihres verbundenen Kontos zu beginnen.",
    img: screenshots[0],
    alt: "Die Schaltfläche „Mit Stripe verbinden“ auf AiBlocks",
  },
  {
    title: "Express-Onboarding von Stripe abschließen",
    body: "Den restlichen Ablauf stellt Stripe bereit. Folgen Sie den Anweisungen, um Ihr Konto einzurichten.",
    img: screenshots[1],
    alt: "Start des Stripe-Express-Onboardings",
  },
  {
    title: "Mobilnummer angeben",
    img: screenshots[2],
    alt: "Eingabe einer Mobilnummer",
  },
  {
    title: "Den 6-stelligen Code eingeben, den Stripe per SMS an Ihr Mobiltelefon schickt",
    img: screenshots[3],
    alt: "Eingabe des Bestätigungscodes",
  },
  {
    title: "Angaben zu Ihrem Unternehmen machen",
    img: screenshots[4],
    alt: "Auswahl der Unternehmensart",
  },
  {
    title: "Persönliche Daten angeben",
    img: screenshots[5],
    alt: "Formular für persönliche Daten",
  },
  {
    title: "Unternehmensdaten ergänzen",
    img: screenshots[6],
    alt: "Formular für Unternehmensdaten",
  },
  {
    title: "Bankkonto für Auszahlungen hinzufügen",
    body: "Auf dieses Konto werden Ihre Einnahmen ausgezahlt. Zahlungen von Käufern gehen direkt auf dieses Konto.",
    img: screenshots[7],
    alt: "Hinzufügen eines Bankkontos für Auszahlungen",
  },
  {
    title: "Prüfen und absenden",
    img: screenshots[8],
    alt: "Bildschirm zum Prüfen und Absenden",
  },
  {
    title: "Fertig: zurück zu AiBlocks",
    body: "Sobald Stripe das Onboarding Ihres Kontos abgeschlossen hat, kehren Sie zu AiBlocks zurück und können kostenpflichtige Komponenten verkaufen.",
    img: screenshots[9],
    alt: "Zurück auf AiBlocks nach dem Onboarding",
  },
];

export default function StripeGuideContent() {
  return (
    <>
      <Guide
        eyebrow="Anleitung für Verkäufer"
        title="Stripe verbinden und bezahlt werden"
        intro="Um kostenpflichtige Komponenten zu verkaufen, verbinden Sie ein Stripe-Konto, damit Käufer Sie direkt bezahlen können. AiBlocks behält 0 % ein, es gilt nur die übliche Bearbeitungsgebühr von Stripe. Hier ist der gesamte Onboarding-Ablauf. Sobald Ihr Konto eingerichtet ist, zahlt Stripe Ihre Einnahmen jeden Montag auf Ihr Bankkonto aus."
        steps={steps}
        related={{ href: "/docs/seller/publish", label: "So veröffentlichen Sie eine Komponente" }}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Link
          href="/dashboard/seller/stripe"
          className="inline-flex items-center justify-center rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors"
        >
          Zum Stripe-Onboarding →
        </Link>
      </div>
    </>
  );
}
