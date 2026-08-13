import { formatCount } from "@/app/lib/format";
import type { PlatformStats } from "@/app/lib/types";

/*
  Trust strip — Design.md Section 5, item 2: small stat cards, not a wall of
  numbers. Every figure comes from GET /stats, which counts rows. Rules.md
  Section 7 rules out anything invented, so there is no "10,000+ happy
  customers" here and never will be.
*/

export function StatStrip({ stats }: { stats: PlatformStats }) {
  const items = [
    { value: stats.total_products, label: "products listed" },
    { value: stats.total_sellers, label: "independent sellers" },
    { value: stats.total_categories, label: "categories" },
  ];

  return (
    <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-5 text-center sm:px-6">
          <dt className="sr-only">{item.label}</dt>
          <dd>
            <span className="block text-2xl font-bold tracking-tight text-ink">
              {formatCount(item.value)}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted sm:text-sm">{item.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
