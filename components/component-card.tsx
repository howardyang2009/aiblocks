import { Link } from "@/i18n/navigation";
import type { ComponentSummary } from "@/types/database";
import { useLocale } from "next-intl";
import { formatNumber, isFreeComponent } from "@/lib/utils";
import { Price } from "@/components/price";

// A card in the browse grid. Metadata sits in monospace because it's data.
export function ComponentCard({ c }: { c: ComponentSummary }) {
  const locale = useLocale();
  return (
    <Link
      href={`/components/${c.id}`}
      className="group block rounded-block border bg-surface p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-medium leading-tight group-hover:text-accent">{c.name}</h3>
        <span className={`font-mono text-xs shrink-0 ${isFreeComponent(c.price_cents) ? "text-free" : "text-ink"}`}>
          <Price cents={c.price_cents} currency={c.currency} />
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
        <span>★ {formatNumber(c.star_count, locale)}</span>
        <span>↓ {formatNumber(c.download_count, locale)}</span>
      </div>
    </Link>
  );
}
