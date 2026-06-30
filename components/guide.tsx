import Link from "next/link";

export type GuideStep = { title: string; body?: string; img: string; alt: string };

// Renders a step-by-step seller guide: numbered steps, each with an optional
// description and a screenshot. Matches the AiBlocks visual language.
export function Guide({
  eyebrow,
  title,
  intro,
  steps,
  related,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  steps: GuideStep[];
  related?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">{title}</h1>
      <p className="text-muted mt-3 max-w-xl">{intro}</p>

      <ol className="mt-12 space-y-12">
        {steps.map((step, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr] gap-4">
            <span className="font-mono text-sm text-accent-ink bg-ink rounded-block w-7 h-7 flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <h2 className="font-display font-medium text-lg leading-snug">{step.title}</h2>
              {step.body && <p className="text-sm text-muted mt-1.5">{step.body}</p>}
              <div className="mt-4 rounded-block border bg-surface overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.img} alt={step.alt} className="w-full h-auto block" />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {related && (
        <div className="mt-14 border-t pt-6">
          <p className="eyebrow mb-1.5">Next</p>
          <Link href={related.href} className="text-accent text-sm hover:underline">
            {related.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
