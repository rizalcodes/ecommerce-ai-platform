"use client";

import Link from "next/link";
import { useState } from "react";

import { Panel, StatCard, TrendChart } from "@/app/components/dashboard/metrics";
import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Select } from "@/app/components/ui/field";
import { formatCount, formatWeek } from "@/app/lib/format";
import type { AdminDashboard } from "@/app/lib/types";

/*
  The longer view of the same data the overview summarises: how supply and
  demand moved week by week, and the full category and seller tables rather than
  the top handful.

  The period selector drives the request, so every figure on the page belongs to
  the same window — there is no mix of all-time and period numbers.
*/

const PERIODS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
];

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-5 py-2.5 text-right text-xs font-medium text-ink-muted">
      {children}
    </th>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState("90");
  const { data, error, loading } = useApi<AdminDashboard>(`/dashboard/admin?days=${days}`);

  return (
    <>
      <PageHeading
        title="Analytics"
        description="Supply and demand across the platform, over a window you choose."
        action={
          <Select
            aria-label="Reporting period"
            className="w-44"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </Select>
        }
      />

      {error && (
        <p className="mb-6 rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="New listings"
          value={data?.new_listings_in_period ?? "—"}
          hint="Products added in this period"
        />
        <StatCard
          label="Inquiries"
          value={data?.inquiries_in_period ?? "—"}
          hint="Buyer messages received in this period"
        />
      </div>

      <div className="mt-6">
        <Panel title="Week by week">
          {loading || !data ? (
            <LoadingRows rows={4} />
          ) : (
            <TrendChart
              series={["New listings", "Inquiries"]}
              points={data.trends.map((point) => ({
                key: point.week_start,
                label: formatWeek(point.week_start),
                values: [point.new_listings, point.inquiries],
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Every category">
          {loading || !data ? (
            <LoadingRows rows={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium text-ink-muted">
                      Category
                    </th>
                    <TableHeading>Products</TableHeading>
                    <TableHeading>Inquiries</TableHeading>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.category_performance.map((row) => (
                    <tr key={row.category_id}>
                      <td className="px-5 py-2.5">
                        <Link href={`/categories/${row.slug}`} className="text-ink hover:text-accent-ink">
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-ink-muted">
                        {formatCount(row.product_count)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                        {formatCount(row.inquiry_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Sellers by inquiries received">
          {loading || !data ? (
            <LoadingRows rows={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium text-ink-muted">
                      Shop
                    </th>
                    <TableHeading>Products</TableHeading>
                    <TableHeading>Inquiries</TableHeading>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.seller_performance.map((row) => (
                    <tr key={row.seller_id}>
                      <td className="px-5 py-2.5">
                        <Link href={`/sellers/${row.seller_id}`} className="text-ink hover:text-accent-ink">
                          {row.store_name ?? row.name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-ink-muted">
                        {formatCount(row.product_count)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                        {formatCount(row.inquiry_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <p className="mt-6 text-xs text-ink-faint">
        Counts of products and inquiries only. There is no cart or checkout in this version, so
        there is no revenue figure to report.
      </p>
    </>
  );
}
