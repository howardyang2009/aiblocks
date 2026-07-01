// Shared building blocks for the static legal pages (Terms, Privacy).
// Kept out of app/ so both pages can import the same section/callout
// styling instead of drifting apart over time.

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-8 mt-8 scroll-mt-24">
      <h2 className="font-display font-semibold text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-block border border-line bg-surface px-4 py-3 text-xs text-muted leading-relaxed">
      {children}
    </div>
  );
}

export function LegalToc({ sections }: { sections: { id: string; label: string }[] }) {
  return (
    <nav className="mt-8 border-t border-line pt-6">
      <p className="eyebrow mb-3">On this page</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-muted hover:text-ink underline underline-offset-2">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
