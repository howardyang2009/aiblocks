import { Guide, type GuideStep } from "@/components/guide";
import { screenshotsDe as screenshots } from "./screenshots";

const steps: GuideStep[] = [
  {
    title: "Veröffentlichung starten",
    body: "Klicken Sie im Verkäufer-Dashboard auf „Veröffentlichen“, um zu beginnen.",
    img: screenshots[0],
    alt: "Die Schaltfläche „Veröffentlichen“, mit der die Veröffentlichung startet",
  },
  {
    title: "Formular ausfüllen und auf „Veröffentlichen“ klicken",
    body: "Geben Sie Name, Beschreibung, Ökosysteme, Tags, Preis (0 für kostenlos), README und die ZIP-Datei Ihrer Komponente (max. 10 MB) an. Senden Sie das Formular dann ab.",
    img: screenshots[1],
    alt: "Das ausgefüllte Veröffentlichungsformular",
  },
  {
    title: "Ihre Komponente ist angelegt",
    body: "Nach dem Absenden erscheint die Komponente im Katalog.",
    img: screenshots[2],
    alt: "Bestätigung, dass die neue Komponente angelegt ist",
  },
  {
    title: "Detailseite der Komponente prüfen",
    body: "Die Detailseite zeigt alle Informationen zu Ihrer Komponente: README, Metadaten, Preis und Download.",
    img: screenshots[3],
    alt: "Die Detailseite der Komponente",
  },
  {
    title: "Auf Ihrer Verkäuferseite finden",
    body: "Alle veröffentlichten Komponenten sind auf Ihrem Verkäuferprofil aufgelistet.",
    img: screenshots[4],
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
