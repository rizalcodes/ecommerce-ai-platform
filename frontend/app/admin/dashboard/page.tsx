"use client";

import Link from "next/link";

import {
  BarList,
  Panel,
  ProductMetricList,
  StatCard,
} from "@/app/components/dashboard/metrics";
import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import type { AdminDashboard } from "@/app/lib/types";

/*
  Platform overview — PRD.md 5.5, admin side.

  Four totals, then the two rankings an operator acts on: which categories are
  pulling demand and which sellers are receiving it. The longer view — weekly
  trends and the full category table — lives on /admin/analytics, so this page
  answers "how is the platform doing right now" without scrolling.
*/

export default function AdminDashboardPage() {
  const { data, error, loading } = useApi<AdminDashboard>("/dashboard/admin");

  if (error) {
    return (
      <>
        <PageHeading title="Overview" />
        <p className="rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
          {error}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Overview"
        description={
          data
            ? `Platform totals, with activity measured over the last ${data.period_days} days.`
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sellers" value={data?.total_sellers ?? "—"} />
        <StatCard
          label="Products"
          value={data?.total_products ?? "—"}
          hint={
            data ? `${data.new_listings_in_period} listed in this period` : undefined
          }
        />
        <StatCard label="Categories" value={data?.total_categories ?? "—"} />
        <StatCard
          label="Inquiries"
          value={data?.total_inquiries ?? "—"}
          hint={data ? `${data.inquiries_in_period} in this period` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Categories by demand"
          action={
            <Link href="/admin/analytics" className="text-sm text-accent-ink hover:underline">
              Full breakdown
            </Link>
          }
        >
          {loading || !data ? (
            <LoadingRows rows={5} />
          ) : (
            <BarList
              items={data.category_performance.slice(0, 6).map((row) => ({
                key: row.category_id,
                label: row.name,
                value: row.inquiry_count,
                href: `/categories/${row.slug}`,
                meta: `${row.product_count} ${
                  row.product_count === 1 ? "product" : "products"
                } listed`,
              }))}
              emptyMessage="No categories yet."
            />
          )}
        </Panel>

        <Panel
          title="Sellers by inquiries received"
          action={
            <Link href="/admin/users" className="text-sm text-accent-ink hover:underline">
              All accounts
            </Link>
          }
        >
          {loading || !data ? (
            <LoadingRows rows={5} />
          ) : (
            <BarList
              items={data.seller_performance.slice(0, 6).map((row) => ({
                key: row.seller_id,
                label: row.store_name ?? row.name,
                value: row.inquiry_count,
                href: `/sellers/${row.seller_id}`,
                meta: `${row.product_count} ${
                  row.product_count === 1 ? "product" : "products"
                } listed`,
              }))}
              emptyMessage="No sellers yet."
            />
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Most viewed products platform-wide">
          {loading || !data ? (
            <LoadingRows />
          ) : (
            <ProductMetricList
              items={data.top_viewed_products}
              unit="views"
              emptyMessage="No views recorded in this period."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
