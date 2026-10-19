import type { Metadata } from "next";
import { Guide, type GuideStep } from "@/components/guide";

export const metadata: Metadata = {
  title: "Eine Komponente veröffentlichen — AiBlocks-Anleitung für Verkäufer",
  description: "Schritt für Schritt: So veröffentlichen Sie Ihre KI-Komponente auf AiBlocks.",
};

const steps: GuideStep[] = [
  {
    title: "Veröffentlichung starten",
    body: "Klicken Sie im Verkäufer-Dashboard auf „Veröffentlichen“, um zu beginnen.",
    img: "/guides/publish/01.png",
    alt: "Die Schaltfläche „Veröffentlichen“, mit der die Veröffentlichung startet",
  },
  {
    title: "Formular ausfüllen und auf „Veröffentlichen“ klicken",
    body: "Geben Sie Name, Beschreibung, Ökosysteme, Tags, Preis (0 für kostenlos), README und die ZIP-Datei Ihrer Komponente (max. 10 MB) an. Senden Sie das Formular dann ab.",
    img: "/guides/publish/02.png",
    alt: "Das ausgefüllte Veröffentlichungsformular",
  },
  {
    title: "Ihre Komponente ist angelegt",
    body: "Nach dem Absenden erscheint die Komponente im Katalog.",
    img: "/guides/publish/03.png",
    alt: "Bestätigung, dass die neue Komponente angelegt ist",
  },
  {
    title: "Detailseite der Komponente prüfen",
    body: "Die Detailseite zeigt alle Informationen zu Ihrer Komponente: README, Metadaten, Preis und Download.",
    img: "/guides/publish/04.png",
    alt: "Die Detailseite der Komponente",
  },
  {
    title: "Auf Ihrer Verkäuferseite finden",
    body: "Alle veröffentlichten Komponenten sind auf Ihrem Verkäuferprofil aufgelistet.",
    img: "/guides/publish/05.png",
    alt: "Die Verkäuferseite mit den veröffentlichten Komponenten",
  },
];

export default function PublishGuideContent() {
  return (
    <Guide
      eyebrow="Anleitung für Verkäufer"
      title="Eine Komponente veröffentlichen"
      intro="Die Veröffentlichung dauert nur ein paar Minuten. Hier ist der gesamte Ablauf, von der Schaltfläche „Veröffentlichen“ bis zu Ihrer Komponente auf Ihrer Verkäuferseite."
      steps={steps}
      related={{ href: "/docs/seller/stripe", label: "Als Nächstes: Stripe verbinden, um bezahlt zu werden" }}
    />
  );
}
