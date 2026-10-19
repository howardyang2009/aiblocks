import type { Metadata } from "next";
import { AssemblyGrid } from "@/components/brand/assembly-grid";

export const metadata: Metadata = {
  title: "Über uns — AiBlocks",
  description: "Warum es AiBlocks gibt und welche Entscheidungen hinter dem Marktplatz stehen.",
};

const ECOSYSTEMS = ["claude", "chatgpt", "gemini", "deepseek", "und mehr"];

const PRINCIPLES: [string, string][] = [
  ["Offene Veröffentlichung", "Jeder kann veröffentlichen. Keine manuelle Kuratierung und keine Hürden durch die Plattform."],
  ["Qualität durch die Community", "Sterne, Downloads und Bewertungen verifizierter Käufer zeigen, was wirklich gut ist."],
  ["0 % Plattformgebühr zum Start", "Bezahlte Downloads gehen über Stripe Connect direkt an den Verkäufer."],
  ["Harte Bezahlschranke, ehrliche Preise", "Käufer zahlen vor dem Download einer kostenpflichtigen Komponente. Keine Teilvorschauen, die sich ausnutzen lassen."],
  ["Immer die neueste Version", "Kein Versionswildwuchs. Verkäufer aktualisieren ihr Angebot direkt; das Changelog steht in der README."],
  ["Profile statt Shops", "Verkäuferseiten sind an GitHub angelehnt: Bio, Statistiken und ein Raster mit allem, was veröffentlicht wurde."],
];

export default function AboutContent() {
  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Hero — mirrors the homepage's visual language */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-20">
        <div>
          <p className="eyebrow">AiBlocks</p>
          <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl mt-4 leading-[1.05]">
            Offener Marktplatz für wiederverwendbare KI-Komponenten.
          </h1>
          <p className="mt-5 text-muted max-w-md leading-relaxed">
            KI-Entwicklung bringt viel wiederverwendbare Arbeit hervor: Prompts,
            die einen ganzen Nachmittag Feinschliff gekostet haben, Agenten, die
            durch Ausprobieren abgestimmt wurden, MCP-Server, die an echte APIs
            angebunden sind, Hooks und CLAUDE.md-Konfigurationen, in denen hart
            erarbeitete Konventionen stecken. Das meiste davon verlässt nie das
            Repository, in dem es entstanden ist. Auf AiBlocks schon.
          </p>
        </div>
        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">Einmal veröffentlicht. Überall wiederverwendet.</p>
        </div>
      </section>

      {/* What we mean by "component" */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">Was ist eine Komponente</p>
        <h2 className="font-display font-bold text-2xl mt-2">
          Jeder wiederverwendbare Baustein, in jedem KI-Ökosystem.
        </h2>
        <p className="mt-4 text-muted leading-relaxed">
          Eine Komponente kann ein Prompt für einen Anwendungsfall sein, ein
          wiederverwendbarer Skill, ein Agent, ein Hook, eine
          CLAUDE.md-Konfiguration, ein MCP-Server oder etwas, das noch in
          keine dieser Kategorien passt. Wenn es ein Baustein ist, den jemand
          anderes in den eigenen KI-Workflow einbauen kann, gehört er auf
          AiBlocks.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ECOSYSTEMS.map((e) => (
            <span key={e} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-subtle">
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Two flows: buyer / seller, side by side */}
      <section className="py-12 border-t">
        <p className="eyebrow">So funktioniert es</p>
        <div className="grid sm:grid-cols-2 gap-10 mt-4">
          <div>
            <h3 className="font-display font-semibold text-lg">Wenn Sie entwickeln</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>Registrieren Sie sich und verbinden Sie Stripe (nur nötig, um kostenpflichtige Komponenten zu verkaufen).</li>
              <li>Laden Sie eine ZIP-Datei hoch, schreiben Sie eine README und vergeben Sie Tags nach Ökosystem und Thema.</li>
              <li>Legen Sie einen Preis fest oder bieten Sie die Komponente kostenlos an.</li>
              <li>Sie werden direkt bezahlt. Aktualisieren Sie das Angebot, wann immer es besser wird.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">Wenn Sie suchen</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>Suchen oder filtern Sie nach Tag und Ökosystem.</li>
              <li>Lesen Sie die README, prüfen Sie Sterne, Downloads und Bewertungen.</li>
              <li>Laden Sie kostenlose Komponenten sofort herunter, für die anderen bezahlen Sie.</li>
              <li>Laden Sie jederzeit erneut über Ihr Dashboard herunter.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Principles — the real decisions behind the platform */}
      <section className="py-12 border-t">
        <p className="eyebrow">Wie AiBlocks gebaut ist</p>
        <h2 className="font-display font-bold text-2xl mt-2">Einige Entscheidungen, die wir bewusst getroffen haben</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {PRINCIPLES.map(([h, b]) => (
            <div key={h}>
              <h3 className="font-display font-medium text-base">{h}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A note on how AiBlocks itself was built */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">Offen entwickelt</p>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          AiBlocks wurde mit Unterstützung von Claude gebaut. Produktentscheidungen,
          Review und Verantwortung blieben dabei durchgehend in menschlicher Hand:
          Vision, Preismodell und alles, was unter dem Namen AiBlocks erscheint.
          Für einen Marktplatz rund um KI-gestütztes Bauen war es uns wichtig,
          offen zu sagen, wie er selbst entstanden ist.
        </p>
      </section>
    </div>
  );
}
