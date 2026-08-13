import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatCount } from "@/app/lib/format";

/*
  Dashboard metric components.

  No chart library. Design.md Section 6 rules out default Recharts blue, and the
  surest way to honour that is to draw the few shapes these dashboards need with
  the brand tokens directly. Sky Blue carries the primary series and Charcoal the
  comparison; Warm Yellow stays a micro-accent, marking one state rather than
  carrying a series.

  Sky Blue measures 2.6:1 against the tracks these bars sit on, short of the 3:1
  WCAG asks of a graphical object. Every bar here is therefore redundant: the
  number it encodes is printed in text beside it, and the trend chart carries a
  screen-reader table. The bars rank at a glance; the text is what states the
  value.
*/

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-ink">
        {typeof value === "number" ? formatCount(value) : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Horizontal bars for ranked lists — categories, sellers, products. */
export function BarList({
  items,
  emptyMessage = "Nothing to show yet.",
}: {
  items: { key: string; label: string; value: number; href?: string; meta?: string }[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-muted">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="px-5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            {item.href ? (
              <Link href={item.href} className="truncate text-sm text-ink hover:text-accent-ink">
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-sm text-ink">{item.label}</span>
            )}
            <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
              {formatCount(item.value)}
            </span>
          </div>
          {item.meta && <p className="mt-0.5 text-xs text-ink-faint">{item.meta}</p>}
          <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-canvas">
            <div
              className="h-full rounded-sm bg-accent"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ranked products with their photo, for "most viewed" and "most inquired". */
export function ProductMetricList({
  items,
  unit,
  emptyMessage,
}: {
  items: {
    product_id: string;
    name: string;
    slug: string;
    main_image_url: string | null;
    value: number;
  }[];
  unit: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.product_id}>
          <Link
            href={`/products/${item.product_id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-canvas"
          >
            <span className="relative size-10 shrink-0 overflow-hidden rounded-sm border border-line bg-canvas">
              {item.main_image_url && (
                <Image src={item.main_image_url} alt="" fill sizes="40px" className="object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
              {formatCount(item.value)}
              <span className="ml-1 text-xs font-normal text-ink-faint">{unit}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Inquiry status split. Charcoal, Sky Blue, and a muted tone — one bar, three
    segments, so the proportions read at a glance. */
export function StatusBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; className: string }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="px-5 py-4">
      {total === 0 ? (
        <p className="text-sm text-ink-muted">No inquiries yet.</p>
      ) : (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-sm bg-canvas">
            {segments.map((segment) =>
              segment.value > 0 ? (
                <div
                  key={segment.key}
                  className={segment.className}
                  style={{ width: `${(segment.value / total) * 100}%` }}
                  title={`${segment.label}: ${segment.value}`}
                />
              ) : null,
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {segments.map((segment) => (
              <div key={segment.key}>
                <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className={`size-2 rounded-sm ${segment.className}`} aria-hidden />
                  {segment.label}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                  {formatCount(segment.value)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

/** Two weekly series side by side — new listings against inquiries.

    Drawn as plain divs on a shared baseline rather than a chart component: two
    series over a dozen weeks needs a scale, a baseline and bars, and nothing
    else.

    Sky Blue and Deep Charcoal carry the two series. Warm Yellow was the second
    series first, and it measures 1.6:1 against the card behind it — a bar that
    pale is decoration, not data. Design.md Section 6 names Charcoal as a chart
    colour and Section 2 keeps the yellow a micro-accent, so this is where both
    belong. The bars are also transcribed into a table for screen readers, since
    a hover tooltip is not a way to read a number. */
export function TrendChart({
  points,
  series,
}: {
  points: { key: string; label: string; values: [number, number] }[];
  series: [string, string];
}) {
  if (points.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-muted">No activity in this period.</p>;
  }

  const max = Math.max(1, ...points.flatMap((point) => point.values));
  const totals: [number, number] = [
    points.reduce((sum, point) => sum + point.values[0], 0),
    points.reduce((sum, point) => sum + point.values[1], 0),
  ];

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-baseline gap-1.5 text-xs text-ink-muted">
          <span className="size-2 translate-y-px rounded-sm bg-accent" aria-hidden />
          {series[0]}
          <span className="font-medium tabular-nums text-ink">{formatCount(totals[0])}</span>
        </span>
        <span className="flex items-baseline gap-1.5 text-xs text-ink-muted">
          <span className="size-2 translate-y-px rounded-sm bg-ink" aria-hidden />
          {series[1]}
          <span className="font-medium tabular-nums text-ink">{formatCount(totals[1])}</span>
        </span>
        <span className="ml-auto text-xs tabular-nums text-ink-faint">
          busiest week {formatCount(max)}
        </span>
      </div>

      <div className="mt-4 flex h-40 items-end gap-2 border-b border-line-strong" aria-hidden>
        {points.map((point) => (
          <div
            key={point.key}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
          >
            <div
              className="w-1/2 max-w-4 rounded-t-sm bg-accent"
              style={{ height: `${(point.values[0] / max) * 100}%` }}
              title={`${point.label} — ${series[0]}: ${point.values[0]}`}
            />
            <div
              className="w-1/2 max-w-4 rounded-t-sm bg-ink"
              style={{ height: `${(point.values[1] / max) * 100}%` }}
              title={`${point.label} — ${series[1]}: ${point.values[1]}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2" aria-hidden>
        {points.map((point) => (
          <span
            key={point.key}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-faint"
          >
            {point.label}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>
          {series[0]} and {series[1]} per week
        </caption>
        <thead>
          <tr>
            <th scope="col">Week beginning</th>
            <th scope="col">{series[0]}</th>
            <th scope="col">{series[1]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.values[0]}</td>
              <td>{point.values[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
