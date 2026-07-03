import Link from "next/link";
import type { ComponentSummary } from "@/types/database";
import { formatPrice, isFreeComponent } from "@/lib/utils";

// A card in the browse grid. Metadata sits in monospace because it's data.
export function ComponentCard({ c }: { c: ComponentSummary }) {
  return (
    <Link
      href={`/components/${c.id}`}
      className="group block rounded-block border bg-surface p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-medium leading-tight group-hover:text-accent">{c.name}</h3>
        <span className={`font-mono text-xs shrink-0 ${isFreeComponent(c.price_cents) ? "text-free" : "text-ink"}`}>
          {formatPrice(c.price_cents, c.currency)}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted line-clamp-2">{c.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.ecosystems.map((e) => (
          <span key={e} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">
            {e}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 font-mono text-[11px] text-subtle">
        <span>★ {c.star_count}</span>
        <span>↓ {c.download_count}</span>
      </div>
    </Link>
  );
}
